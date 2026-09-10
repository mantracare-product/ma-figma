/**
 * AdminSidebar.tsx
 * Path: src/app/components/layout/AdminSidebar.tsx
 *
 * Dedicated Admin Portal Sidebar navigation:
 * - Positioned strictly below the topbar.
 * - Smoothly opens/closes when hamburger is clicked via transition-all duration-300.
 * - Middle navigation area scrolls independently (flex-1 overflow-y-auto).
 * - Bottom footer ("Back to Clinic App" and "Log out") is pinned (shrink-0),
 *   never shifting position when accordions expand or collapse.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  CreditCard,
  PhoneCall,
  Coins,
  Activity,
  FolderGit2,
  FolderTree,
  Briefcase,
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

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
        { id: "industry-category", label: "Industry Category", icon: FolderTree, path: "/admin/industry-category" },
        { id: "industries", label: "Industries", icon: Briefcase, path: "/admin/industries" },
        { id: "process-templates", label: "Process templates", icon: LayoutTemplate, path: "/admin/process-templates" },
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
      return location.pathname === "/admin/industry-category";
    }
    if (itemPath === "/admin/industries") {
      return (
        location.pathname === "/admin/industries" ||
        location.pathname === "/admin/industry"
      );
    }
    return location.pathname === itemPath;
  };

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white flex flex-col z-40 shadow-xl transition-transform duration-300 ease-in-out select-none border-r border-gray-200/90 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col justify-between">
        {/* ── Scrollable Accordion Section Area ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {sections.map((section) => {
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
          })}
        </div>

        {/* ── Fixed/Pinned Bottom Controls (Never Shifts Position) ── */}
        <div className="shrink-0 p-4 border-t border-gray-100 space-y-1 bg-[#FAFAFA]">
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
        </div>
      </div>
    </aside>
  );
}
