import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  Building2,
  Sliders,
  ClipboardList,
  FileText,
  CreditCard,
  Link2,
  BookOpen,
  Shield,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface SettingsSubnavProps {
  activeId?: string;
  onSelectTab?: (tabId: string) => void;
  className?: string;
}

export const SettingsSubnav: React.FC<SettingsSubnavProps> = ({
  activeId,
  onSelectTab,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [billingExpanded, setBillingExpanded] = useState(true);

  // Determine current active item if not passed explicitly
  const currentActive =
    activeId ||
    (location.pathname === "/organizations"
      ? "organizations"
      : location.pathname === "/process"
      ? "process-settings"
      : location.pathname === "/web-forms"
      ? "forms"
      : location.pathname === "/knowledge-base"
      ? "knowledge-base"
      : location.pathname === "/profile"
      ? "account"
      : "organizations");

  const handleItemClick = (item: any) => {
    if (item.isParent) {
      setBillingExpanded(!billingExpanded);
      if (onSelectTab) {
        onSelectTab(item.children?.[0]?.id || "plans");
      }
      return;
    }

    if (onSelectTab) {
      onSelectTab(item.id);
    }

    if (item.path && location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  const navItems = [
    {
      id: "organizations",
      label: "Organizations",
      icon: Building2,
      path: "/organizations",
    },
    {
      id: "process-settings",
      label: "Process Settings",
      icon: Sliders,
      path: "/process",
    },
    {
      id: "custom-fields",
      label: "Custom Fields",
      icon: ClipboardList,
      path: "/settings?tab=custom-fields",
    },
    {
      id: "forms",
      label: "Forms",
      icon: FileText,
      path: "/web-forms",
    },
    {
      id: "billing",
      label: "Billing",
      icon: CreditCard,
      isParent: true,
      children: [
        { id: "plan-overview", label: "Plan Overview", path: "/settings?tab=plans" },
        { id: "plans", label: "Plans & Subscriptions", path: "/settings?tab=plans" },
        { id: "transactions", label: "Transactions", path: "/transactions" },
        { id: "billing-settings", label: "Billing Settings", path: "/settings?tab=payments" },
      ],
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Link2,
      path: "/settings?tab=integrations",
    },
    {
      id: "knowledge-base",
      label: "Knowledge Base",
      icon: BookOpen,
      path: "/knowledge-base",
    },
    {
      id: "roles",
      label: "Roles & Permissions",
      icon: Shield,
      path: "/settings?tab=security",
    },
    {
      id: "account",
      label: "Account",
      icon: User,
      path: "/profile",
    },
  ];

  return (
    <div
      className={`w-[230px] flex-shrink-0 bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[28px] p-3.5 space-y-1 self-start ${className}`}
    >
      {/* Header Label */}
      <div className="px-3.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] font-display">
        SETTINGS
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isBillingChildActive =
            item.children &&
            item.children.some((child) => child.id === currentActive);
          const isActive = currentActive === item.id || isBillingChildActive;
          const Icon = item.icon;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive && !item.isParent
                    ? "text-white shadow-sm"
                    : isActive && item.isParent
                    ? "text-[#181e25] bg-slate-100/70"
                    : "text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60"
                }`}
              >
                {isActive && !item.isParent && (
                  <motion.div
                    layoutId="settingsNavActivePill"
                    className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive && !item.isParent
                        ? "text-white"
                        : "text-slate-500"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.isParent && (
                  <span className="text-slate-400">
                    {billingExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </button>

              {/* Sub-items for parent */}
              {item.isParent && billingExpanded && item.children && (
                <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = currentActive === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          if (onSelectTab) onSelectTab(child.id);
                          if (child.path && location.pathname !== child.path) {
                            navigate(child.path);
                          }
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-between ${
                          isChildActive
                            ? "text-[#1456f0] bg-blue-50/80 font-bold"
                            : "text-[#64748b] hover:text-[#222222] hover:bg-slate-100/50 font-medium"
                        }`}
                      >
                        <span>{child.label}</span>
                        {isChildActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsSubnav;
