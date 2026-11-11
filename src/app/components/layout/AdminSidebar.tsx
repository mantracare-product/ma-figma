/**
 * AdminSidebar.tsx
 * Path: src/app/components/layout/AdminSidebar.tsx
 *
 * Dedicated Admin Portal Side Drawer Navigation:
 * - Positioned below the top bar, sliding out on-demand via the hamburger button.
 * - Navigation sections match exact MA client hover and active styles.
 * - Links automatically close drawer on selection.
 * - Bottom has pinned Admin user card with avatar, role, and logout menu.
 * - 6 Group Restructure: CORPORATE, TELEPHONY, BILLING & ORDERS, PRODUCT ANALYTICS, TEMPLATES, INTEGRATIONS, SETTINGS.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  CreditCard,
  PhoneCall,
  Coins,
  Activity,
  FolderTree,
  LayoutTemplate,
  CheckSquare,
  FileCode,
  SlidersHorizontal,
  Shield,
  Building2,
  BarChart2,
  Users,
  FileText,
  LogOut,
  Zap,
  Sparkles,
  User,
  Tag,
  BookOpen,
  ShieldCheck,
  Phone,
  Radio,
  Workflow,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { OPEN_USER_PROFILE_DRAWER_EVENT } from "../TeamMemberDrawer";
import { canAdminRoleView } from "../../../lib/adminRolesStore";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  moduleId?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export default function AdminSidebar({ onClose }: AdminSidebarProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Accordion state - auto-expanded section containing active route
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    corporate: true,
    billingOrders: true,
    productAnalytics: true,
    templates: false,
    integrations: false,
    settings: false,
  });

  // User profile upward dropdown state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleSignOut = () => {
    logout();
    toast.success("Logged out of Admin Portal");
    navigate("/login");
  };

  const sections: NavSection[] = [
    {
      id: "corporate",
      title: "CORPORATE",
      items: [
        { id: "organizations", label: "Organizations", icon: Building2, path: "/admin/organizations", moduleId: "organizations" },
        { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/admin/tasks", moduleId: "tasks" },
        { id: "industry-category", label: "Industries", icon: FolderTree, path: "/admin/industry-category", moduleId: "industries" },
      ],
    },
    {
      id: "billingOrders",
      title: "BILLING & ORDERS",
      items: [
        { id: "orders", label: "Orders", icon: ShoppingCart, path: "/admin/billing/orders", moduleId: "orders" },
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard, path: "/admin/billing/subscriptions", moduleId: "subscriptions" },
        { id: "plans", label: "Plans & Credits", icon: Coins, path: "/admin/plans", moduleId: "plans" },
      ],
    },
    {
      id: "productAnalytics",
      title: "PRODUCT ANALYTICS",
      items: [
        { id: "calls", label: "Calls", icon: PhoneCall, path: "/admin/product-analytics/calls", moduleId: "productAnalyticsCalls" },
      ],
    },
    {
      id: "templates",
      title: "TEMPLATES",
      items: [
        { id: "workflows", label: "Workflows", icon: LayoutTemplate, path: "/admin/workflows", moduleId: "workflows" },
        { id: "automations", label: "Automations", icon: Zap, path: "/admin/automations", moduleId: "automations" },
        { id: "forms", label: "Forms", icon: CheckSquare, path: "/admin/forms", moduleId: "forms" },
        { id: "document-templates", label: "Document Templates", icon: FileCode, path: "/admin/document-templates", moduleId: "documentTemplates" },
        { id: "services", label: "Product / Services", icon: Tag, path: "/admin/services", moduleId: "services" },
        { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen, path: "/admin/knowledge-base", moduleId: "knowledgeBase" },
        { id: "custom-fields", label: "Sections/Fields", icon: SlidersHorizontal, path: "/admin/custom-fields", moduleId: "customFields" },
        { id: "sidebar-config", label: "Sidebar Navigation", icon: LayoutTemplate, path: "/admin/sidebar-config", moduleId: "sidebarNavigation" },
        { id: "roles", label: "Roles & Permissions", icon: Shield, path: "/admin/roles", moduleId: "roles" },
      ],
    },
    {
      id: "integrations",
      title: "INTEGRATIONS",
      items: [
        { id: "ai-voices-models", label: "AI Voices & Models", icon: Sparkles, path: "/admin/ai-voices-models", moduleId: "aiVoicesModels" },
        { id: "telephony", label: "Telephony", icon: Radio, path: "/admin/integrations/telephony", moduleId: "telephonyProviders" },
      ],
    },
    {
      id: "settings",
      title: "SETTINGS",
      items: [
        { id: "user-management", label: "User Management", icon: Users, path: "/admin/settings/users", moduleId: "userManagement" },
        { id: "logs", label: "Audit Logs", icon: FileText, path: "/admin/settings/logs", moduleId: "auditLogs" },
      ],
    },
  ];

  const roleName = user?.role || "SystemAdmin";
  const visibleSections = useMemo(() => {
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          if (!item.moduleId) return true;
          if (item.id === "telephony") {
            return (
              canAdminRoleView(roleName, "telephonyProviders") ||
              canAdminRoleView(roleName, "telephonyNumbers")
            );
          }
          return canAdminRoleView(roleName, item.moduleId);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, roleName]);

  const isPathActive = (itemPath: string) => {
    if (itemPath === "/admin/custom-fields") {
      return location.pathname === "/admin/custom-fields" || location.pathname === "/admin";
    }
    if (itemPath === "/admin/industry-category") {
      return (
        location.pathname === "/admin/industry-category" ||
        location.pathname === "/admin/industries" ||
        location.pathname === "/admin/industry"
      );
    }
    if (itemPath === "/admin/workflows") {
      return (
        location.pathname === "/admin/workflows" ||
        location.pathname === "/admin/processes" ||
        location.pathname === "/admin/process"
      );
    }
    if (itemPath === "/admin/automations") {
      return (
        location.pathname === "/admin/automations" ||
        location.pathname === "/admin/automation"
      );
    }
    if (itemPath === "/admin/ai-voices-models") {
      return (
        location.pathname === "/admin/ai-voices-models" ||
        location.pathname === "/admin/ai-voices" ||
        location.pathname === "/admin/voice-config"
      );
    }
    if (itemPath === "/admin/document-templates") {
      return (
        location.pathname === "/admin/document-templates" ||
        location.pathname === "/admin/document-template"
      );
    }
    if (itemPath === "/admin/forms") {
      return (
        location.pathname === "/admin/forms" ||
        location.pathname === "/admin/form-templates" ||
        location.pathname === "/admin/form-builder" ||
        location.pathname.startsWith("/admin/form-builder")
      );
    }
    if (itemPath === "/admin/services") {
      return (
        location.pathname === "/admin/services" ||
        location.pathname === "/admin/products-services" ||
        location.pathname === "/admin/product-services" ||
        location.pathname === "/admin/industry-services"
      );
    }
    if (itemPath === "/admin/knowledge-base") {
      return (
        location.pathname === "/admin/knowledge-base" ||
        location.pathname === "/admin/knowledge"
      );
    }
    if (itemPath === "/admin/roles") {
      return (
        location.pathname === "/admin/roles" ||
        location.pathname === "/admin/roles-permissions" ||
        location.pathname === "/admin/roles-and-permissions"
      );
    }
    if (itemPath === "/admin/settings/users") {
      return (
        location.pathname === "/admin/settings/users" ||
        location.pathname === "/admin/users"
      );
    }
    if (itemPath === "/admin/integrations/telephony") {
      return (
        location.pathname === "/admin/integrations/telephony" ||
        location.pathname === "/admin/integrations/telephony-providers" ||
        location.pathname === "/admin/telephony/numbers" ||
        location.pathname === "/admin/telephony/calls" ||
        location.pathname === "/admin/telephony"
      );
    }
    if (itemPath === "/admin/settings/logs") {
      return (
        location.pathname === "/admin/settings/logs" ||
        location.pathname === "/admin/logs"
      );
    }
    if (itemPath === "/admin/plans") {
      return (
        location.pathname === "/admin/plans" ||
        location.pathname === "/admin/plans-credits" ||
        location.pathname === "/admin/credits"
      );
    }
    return location.pathname === itemPath;
  };

  // Auto-expand section containing current active path
  useEffect(() => {
    visibleSections.forEach((sec) => {
      const hasActive = sec.items.some((it) => isPathActive(it.path));
      if (hasActive) {
        setExpandedSections((prev) => ({
          ...prev,
          [sec.id]: true,
        }));
      }
    });
  }, [location.pathname, visibleSections]);

  return (
    <aside className="h-full w-64 min-w-[256px] max-w-[256px] bg-white flex flex-col shrink-0 select-none z-30 relative border-r border-gray-200/80">
      <div className="h-full w-full flex flex-col justify-between overflow-hidden">
        {/* ── Middle Scrollable Navigation List (Starts right below the topbar) ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {visibleSections.map((section) => {
            const isExpanded = !!expandedSections[section.id];
            const hasActiveChild = section.items.some((it) => isPathActive(it.path));

            return (
              <div key={section.id} className="space-y-1.5">
                {/* Accordion Header Button matching MA styling */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider rounded-lg transition-all cursor-pointer group ${
                    hasActiveChild && !isExpanded
                      ? "text-gray-900 bg-gray-100/70"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50/80"
                  }`}
                >
                  <span className="group-hover:text-gray-900 transition-colors">
                    {section.title}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                </button>

                {/* Accordion Body Items matching MA styling */}
                {isExpanded && (
                  <div className="pt-1 pb-2 space-y-1 pl-1">
                    {section.items.map((item) => {
                      const active = isPathActive(item.path);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={onClose}
                          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all group ${
                            active
                              ? "bg-[#1E293B] text-white font-semibold shadow-xs"
                              : "text-[#475569] hover:text-[#0F172A] hover:bg-gray-50"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              active ? "text-white" : "text-[#64748B] group-hover:text-[#0F172A]"
                            }`}
                          />
                          <span className="truncate flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Fixed/Pinned Bottom Admin Profile Card (Matches MA Sidebar) ── */}
        <div className="shrink-0 p-3 border-t border-gray-100 bg-[#FAFAFA] relative" ref={userMenuRef}>
          {/* Upward Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  window.dispatchEvent(new CustomEvent(OPEN_USER_PROFILE_DRAWER_EVENT));
                  if (onClose) onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#1456f0] hover:bg-blue-50/60 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span>Profile</span>
              </button>

              <div className="border-t border-gray-100 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}

          {/* Trigger Card Button */}
          <button
            type="button"
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-200/60 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {user?.name || "Admin"}
                </div>
                <div className="text-[10px] text-gray-500 font-medium truncate">
                  {user?.role || "SystemAdmin"}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
