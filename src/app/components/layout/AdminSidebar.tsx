/**
 * AdminSidebar.tsx
 * Path: src/app/components/layout/AdminSidebar.tsx
 *
 * Dedicated Admin Portal Sidebar navigation:
 * - Docked inline navigation matching client Sidebar.
 * - Collapsible to 68px (icon rail) or expandable to 256px (full accordion).
 * - Middle navigation area scrolls independently (flex-1 overflow-y-auto).
 * - Bottom footer ("Back to Clinic App" and "Log out") is pinned (shrink-0).
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  Blocks,
  Users,
  FileText,
  Megaphone,
  LogOut,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { toast } from "sonner";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export default function AdminSidebar({ onClose }: AdminSidebarProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: false,
    setup: true,
    corporate: false,
    settings: false,
  });

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
      id: "overview",
      title: "OVERVIEW",
      items: [
        { id: "orders", label: "Orders", icon: ShoppingCart, path: "/admin/orders" },
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard, path: "/admin/subscriptions" },
        { id: "call-logs", label: "Calls logs", icon: PhoneCall, path: "/admin/call-logs" },
        { id: "credits", label: "Credits/ transactions", icon: Coins, path: "/admin/credits" },
        { id: "usages", label: "Usages (LiveKit / Dogra, Cartesia)", icon: Activity, path: "/admin/usages" },
      ],
    },
    {
      id: "setup",
      title: "SETUP",
      items: [
        { id: "industry-category", label: "Industries", icon: FolderTree, path: "/admin/industry-category" },
        { id: "workflows", label: "Workflows", icon: LayoutTemplate, path: "/admin/workflows" },
        { id: "automations", label: "Automations", icon: Zap, path: "/admin/automations" },
        { id: "forms", label: "Forms", icon: CheckSquare, path: "/admin/forms" },
        { id: "document-templates", label: "Document Templates", icon: FileCode, path: "/admin/document-templates" },
        { id: "custom-fields", label: "Sections/Fields", icon: SlidersHorizontal, path: "/admin/custom-fields" },
        { id: "roles", label: "Roles & Permissions", icon: Shield, path: "/admin/roles" },
      ],
    },
    {
      id: "corporate",
      title: "CORPORATE",
      items: [
        { id: "organizations", label: "Organizations", icon: Building2, path: "/admin/organizations" },
        { id: "analytics", label: "Analytics", icon: BarChart2, path: "/admin/reports" },
      ],
    },
    {
      id: "settings",
      title: "SETTINGS",
      items: [
        { id: "plans", label: "Plans", icon: CreditCard, path: "/admin/settings" },
        { id: "integration", label: "Integration", icon: Blocks, path: "/admin/settings" },
        { id: "user-management", label: "User Management", icon: Users, path: "/admin/users" },
        { id: "logs", label: "Logs", icon: FileText, path: "/admin/logs" },
        { id: "campaigns", label: "Campaigns", icon: Megaphone, path: "/admin/campaigns" },
      ],
    },
  ];

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
    if (itemPath === "/admin/document-templates") {
      return (
        location.pathname === "/admin/document-templates" ||
        location.pathname === "/admin/document-template"
      );
    }
    return location.pathname === itemPath;
  };

  return (
    <aside
      className={`h-full bg-white border-r border-gray-200/90 flex flex-col shrink-0 select-none transition-[width] duration-300 ease-in-out z-30 relative ${
        collapsed ? "w-[68px] min-w-[68px] max-w-[68px]" : "w-64 min-w-[256px] max-w-[256px]"
      }`}
    >
      {/* Floating Circular Collapse/Expand Toggle Button on dividing border */}
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

      <div className="h-full w-full flex flex-col justify-between overflow-hidden">
        {/* ── Top Header / Admin Badge ── */}
        {collapsed ? (
          <div className="p-3 flex justify-center border-b border-gray-100">
            <div
              className="w-8 h-8 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-xs"
              title="Admin Portal"
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          <div className="p-4 pb-2">
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 px-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="truncate">
                  <span
                    className="text-xs font-bold text-gray-900 block truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Admin Console
                  </span>
                  <span className="text-[10px] text-gray-500 block truncate">
                    Platform Management
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Scrollable Navigation Items ── */}
        <div className={`flex-1 overflow-y-auto ${collapsed ? "p-2 space-y-2" : "p-4 space-y-4"} min-h-0`}>
          {collapsed ? (
            /* Collapsed Icon-Only Rail */
            <div className="space-y-1.5 flex flex-col items-center">
              {sections.flatMap((s) => s.items).map((item) => {
                const active = isPathActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    title={item.label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      active
                        ? "bg-[#1E293B] text-white shadow-xs font-semibold"
                        : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Expanded Full Accordion View */
            sections.map((section) => {
              const isExpanded = !!expandedSections[section.id];
              const hasActiveChild = section.items.some((it) => isPathActive(it.path));

              const getHeaderStyle = () => {
                if (isExpanded && hasActiveChild) {
                  return "border-2 border-gray-900 text-gray-900 rounded-full bg-white shadow-2xs";
                }
                if (section.id === "overview") {
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
                        const active = isPathActive(item.path);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.id}
                            to={item.path}
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
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Fixed/Pinned Bottom Controls ── */}
        <div className={`shrink-0 ${collapsed ? "p-2 border-t border-gray-100 flex flex-col items-center gap-1 bg-[#FAFAFA]" : "p-4 border-t border-gray-100 space-y-1 bg-[#FAFAFA]"}`}>
          {collapsed ? (
            <>
              <Link
                to="/clients"
                title="Back to Clinic App"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <ArrowUpRight className="w-4.5 h-4.5" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                title="Log out"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/clients"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
                <span>Back to Clinic App</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
                <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
