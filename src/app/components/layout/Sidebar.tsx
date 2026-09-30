import React, { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { useOrganization } from "../../context/OrganizationContext";
import logo from "../../../imports/ma_logo.png";
import {
  getFilteredNavigation,
  NavItem,
  NavGroup,
} from "../../config/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CollapsedNavItemProps {
  item: NavItem;
  active: boolean;
  hasActive: boolean;
  onClose: () => void;
  isItemActive: (item: NavItem) => boolean;
}

function CollapsedNavItem({
  item,
  active,
  hasActive,
  onClose,
  isItemActive,
}: CollapsedNavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const Icon = item.icon;

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const flyoutHeight = (item.children?.length || 1) * 38 + 64;
      const maxTop = window.innerHeight - flyoutHeight - 16;
      const top = Math.max(12, Math.min(rect.top, maxTop));
      setCoords({
        top,
        left: rect.right + 8,
      });
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hasChildren) {
      updateCoords();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasChildren) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!hasChildren) {
    return (
      <div className="flex justify-center py-0.5">
        <Tooltip text={item.label} placement="right">
          <Link
            to={item.path || "#"}
            onClick={onClose}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              active
                ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-xs"
                : "text-slate-500 hover:text-[#181e25] hover:bg-slate-100"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
          </Link>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      ref={triggerRef}
      className="relative flex justify-center py-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => {
          updateCoords();
          setIsOpen(!isOpen);
        }}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          active || hasActive
            ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-xs"
            : "text-slate-500 hover:text-[#181e25] hover:bg-slate-100"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
      </button>

      {isOpen &&
        createPortal(
          <div
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
            onMouseLeave={() => {
              timeoutRef.current = setTimeout(() => {
                setIsOpen(false);
              }, 150);
            }}
            className="fixed w-56 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span
                className="text-xs font-bold text-slate-800"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {item.label}
              </span>
              {item.roles?.includes("SystemAdmin") && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] px-1.5 py-0.5 rounded-md">
                  Admin
                </span>
              )}
            </div>

            {item.path && (
              <Link
                to={item.path}
                onClick={() => {
                  setIsOpen(false);
                  onClose();
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  active && !hasActive
                    ? "bg-slate-100 text-[#181e25] font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>All {item.label}</span>
              </Link>
            )}

            {item.children?.map((child) => {
              const childActive = isItemActive(child);
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.id}
                  to={child.path || "#"}
                  onClick={() => {
                    setIsOpen(false);
                    onClose();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    childActive
                      ? "bg-[#181e25] text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <ChildIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      childActive ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

const STORAGE_KEY_GROUPS = "mantra_sidebar_open_groups";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Group accordion state (open groups array)
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return ["workspace"];
  });

  // Expanded items with children (like processes, settings)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    processes: true,
    settings: true,
  });

  // Filtered config based on current role
  const groups = getFilteredNavigation(role);

  // Helper: check if a specific nav item is active
  const isItemActive = (item: NavItem): boolean => {
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (!item.path) return false;
    if (item.path === "/") return currentPath === "/";

    // Settings subpage matching
    if (item.id === "settings-org") {
      return (
        currentPath === "/settings/organization" ||
        (currentPath === "/settings" && (currentSearch.includes("tab=organization") || currentSearch === ""))
      );
    }
    if (item.id === "settings-team") {
      return (
        currentPath.startsWith("/settings/team") ||
        (currentPath === "/settings" && currentSearch.includes("tab=users"))
      );
    }
    if (item.id === "settings-billing") {
      return (
        currentPath.startsWith("/settings/billing") ||
        (currentPath === "/settings" &&
          (currentSearch.includes("tab=plans") ||
            currentSearch.includes("tab=payments") ||
            currentSearch.includes("tab=credit-usage") ||
            currentSearch.includes("tab=billing")))
      );
    }
    if (item.id === "settings-voices") {
      return (
        currentPath.startsWith("/settings/voices") ||
        (currentPath === "/settings" && currentSearch.includes("tab=voice-config"))
      );
    }
    if (item.id === "settings-numbers") {
      return (
        currentPath.startsWith("/settings/numbers") ||
        (currentPath === "/settings" && currentSearch.includes("tab=numbers"))
      );
    }
    if (item.id === "settings-sections") {
      return (
        currentPath.startsWith("/settings/sections") ||
        (currentPath === "/settings" &&
          (currentSearch.includes("tab=custom-fields") || currentSearch.includes("tab=layout")))
      );
    }
    if (item.id === "settings-integrations") {
      return (
        currentPath.startsWith("/settings/integrations") ||
        (currentPath === "/settings" && currentSearch.includes("tab=integrations"))
      );
    }
    if (item.id === "settings-audit") {
      return (
        currentPath.startsWith("/settings/audit") ||
        (currentPath === "/settings" && currentSearch.includes("tab=audit-logs"))
      );
    }
    if (item.id === "settings-security") {
      return (
        currentPath.startsWith("/settings/security") ||
        (currentPath === "/settings" && currentSearch.includes("tab=security"))
      );
    }

    if (item.id === "settings") {
      return currentPath.startsWith("/settings");
    }

    if (item.id === "processes" || item.id === "process") {
      return currentPath.startsWith("/deals");
    }
    if (item.id === "workflows" || item.id === "process-settings") {
      return currentPath.startsWith("/process");
    }

    return currentPath.startsWith(item.path);
  };

  // Helper: check if item has active child
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some((child) => isItemActive(child));
  };

  // Helper: check if a group contains active item/child
  const groupContainsActive = (group: NavGroup): boolean => {
    return group.items.some((item) => isItemActive(item) || hasActiveChild(item));
  };

  // Auto-open active group and expand parent if child active on route change
  useEffect(() => {
    // Auto-open group containing active item
    groups.forEach((group) => {
      if (groupContainsActive(group) && group.label) {
        setOpenGroups((prev) => {
          if (!prev.includes(group.id)) {
            const updated = [...prev, group.id];
            try {
              localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    });

    // Auto expand parent items with active children
    if (location.pathname.startsWith("/settings")) {
      setExpandedItems((prev) => ({ ...prev, settings: true }));
    }
    if (location.pathname.startsWith("/deals") || location.pathname.startsWith("/process")) {
      setExpandedItems((prev) => ({ ...prev, processes: true }));
    }
  }, [location.pathname, location.search]);

  // Handle group toggle and persist
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const updated = prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      try {
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Toggle accordion item (e.g. settings / processes)
  const toggleItemExpanded = (itemId: string) => {
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

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
    setShowOrgDropdown(false);
  };

  // Separate pinned bottom groups from main groups
  const mainGroups = groups.filter((g) => !g.pinnedBottom);
  const pinnedBottomGroups = groups.filter((g) => g.pinnedBottom);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } bg-white border-r border-slate-200/80 shadow-xs flex flex-col justify-between flex-shrink-0 relative select-none`}
      >
        {/* Floating Sidebar Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden lg:flex absolute top-5 -right-3 w-6 h-6 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs hover:shadow-md hover:bg-white hover:border-slate-300 items-center justify-center text-slate-500 hover:text-slate-800 transition-all duration-200 z-50 cursor-pointer active:scale-90"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3 h-3" />
          ) : (
            <PanelLeftClose className="w-3 h-3" />
          )}
        </button>

        {/* ── Top Logo & Org Area ── */}
        <div className="p-3.5 pb-2 flex flex-col gap-3">
          {/* Logo Header */}
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-start px-1"}`}>
            <Link to="/" onClick={onClose} className="flex items-center gap-2">
              {collapsed ? (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                  <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
                </div>
              ) : (
                <div className="flex items-center py-0.5">
                  <img src={logo} alt="Logo" className="h-8 w-auto max-w-[175px] object-contain" />
                </div>
              )}
            </Link>
          </div>

          {/* Organization Selector Card */}
          {collapsed ? (
            <Tooltip text={activeOrganization?.name || "Demo Mantra"} placement="right">
              <div className="w-8 h-8 mx-auto rounded-lg bg-[#181e25] text-white flex items-center justify-center font-bold text-xs shadow-2xs cursor-default">
                {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "D"}
              </div>
            </Tooltip>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-full bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-2xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#181e25] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                    {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "D"}
                  </div>
                  <span
                    className="text-sm font-bold text-[#181e25] truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {activeOrganization?.name || "Demo Mantra"}
                  </span>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
              </button>

              {/* Organization Dropdown */}
              <AnimatePresence>
                {showOrgDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 space-y-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
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
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-5 h-5 rounded-md bg-[#181e25] text-white flex items-center justify-center text-[10px] font-bold">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{org.name}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                        </button>
                      );
                    })}
                    <div className="border-t border-slate-100 pt-1">
                      <Link
                        to="/settings/organization"
                        onClick={() => {
                          setShowOrgDropdown(false);
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 p-2 text-xs font-medium text-slate-600 hover:text-[#1456f0] hover:bg-blue-50/50 rounded-xl transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Manage Organizations</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Main Scrollable Nav Body ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2.5 py-1 space-y-3">
          <nav aria-label="Main" className="space-y-3">
            {mainGroups.map((group, groupIdx) => {
              const isGroupOpen = openGroups.includes(group.id);
              const hasHeader = Boolean(group.label);

              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header (Expanded mode) or Divider (Collapsed mode) */}
                  {hasHeader && (
                    <>
                      {!collapsed ? (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          aria-expanded={isGroupOpen}
                          className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <span>{group.label}</span>
                          {isGroupOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                          )}
                        </button>
                      ) : (
                        groupIdx > 0 && <div className="my-1.5 border-t border-slate-100 mx-1" />
                      )}
                    </>
                  )}

                  {/* Group Items */}
                  {(!hasHeader || isGroupOpen || collapsed) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isItemActive(item);
                        const hasActive = hasActiveChild(item);
                        const hasChildren = Boolean(item.children && item.children.length > 0);
                        const isExpanded = Boolean(expandedItems[item.id]);
                        const Icon = item.icon;

                        // Collapsed Mode Item
                        if (collapsed) {
                          return (
                            <CollapsedNavItem
                              key={item.id}
                              item={item}
                              active={active}
                              hasActive={hasActive}
                              onClose={onClose}
                              isItemActive={isItemActive}
                            />
                          );
                        }

                        // Expanded Mode Item
                        return (
                          <div key={item.id} className="space-y-0.5">
                            <div className="flex items-center">
                              {hasChildren ? (
                                <div
                                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                                    active && !hasActive
                                      ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm"
                                      : hasActive
                                      ? "bg-slate-100/80 text-[#181e25]"
                                      : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                                  }`}
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                  onClick={() => toggleItemExpanded(item.id)}
                                >
                                  {/* Left click area: Navigate if path exists, or toggle */}
                                  <Link
                                    to={item.path || "#"}
                                    onClick={(e) => {
                                      if (!item.path) {
                                        e.preventDefault();
                                        toggleItemExpanded(item.id);
                                      } else {
                                        onClose();
                                      }
                                    }}
                                    className="flex items-center gap-3 min-w-0 flex-1"
                                  >
                                    <Icon
                                      className={`w-4 h-4 flex-shrink-0 ${
                                        active && !hasActive
                                          ? "text-white"
                                          : hasActive
                                          ? "text-[#181e25]"
                                          : "text-slate-500"
                                      }`}
                                    />
                                    <span className="truncate">{item.label}</span>
                                  </Link>

                                  {/* Right Chevron */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItemExpanded(item.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    aria-expanded={isExpanded}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <Link
                                  to={item.path || "#"}
                                  onClick={onClose}
                                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                                    active
                                      ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm"
                                      : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                                  }`}
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <Icon
                                    className={`w-4 h-4 flex-shrink-0 ${
                                      active ? "text-white" : "text-slate-500"
                                    }`}
                                  />
                                  <span className="truncate flex-1">{item.label}</span>
                                  {item.badge && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        active
                                          ? "bg-emerald-400/20 text-emerald-300"
                                          : "bg-emerald-50 text-emerald-700"
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              )}
                            </div>

                            {/* Expanded Children Accordion */}
                            {hasChildren && isExpanded && (
                              <div className="ml-5 my-0.5 pl-2.5 border-l border-slate-200/80 space-y-0.5">
                                {item.children?.map((child) => {
                                  const childActive = isItemActive(child);
                                  const ChildIcon = child.icon;
                                  return (
                                    <Link
                                      key={child.id}
                                      to={child.path || "#"}
                                      onClick={onClose}
                                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                        childActive
                                          ? "bg-[#181e25] text-white shadow-2xs font-bold"
                                          : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                                      }`}
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <ChildIcon
                                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                                          childActive ? "text-white" : "text-slate-400"
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
          </nav>
        </div>

        {/* ── Pinned Bottom Area ── */}
        <div className="p-2 border-t border-slate-100 space-y-1">
          {pinnedBottomGroups.map((group) => (
            <div key={group.id} className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const hasActive = hasActiveChild(item);
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isExpanded = Boolean(expandedItems[item.id]);
                const Icon = item.icon;

                // Sign Out Action Button
                if (item.isAction) {
                  return collapsed ? (
                    <Tooltip key={item.id} text={item.label} placement="right">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        aria-label={item.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-[#45515e] hover:text-rose-600 hover:bg-rose-50/70 transition-all cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                // Collapsed Pinned Bottom Item (e.g. Settings / Refer & Earn)
                if (collapsed) {
                  return (
                    <CollapsedNavItem
                      key={item.id}
                      item={item}
                      active={active}
                      hasActive={hasActive}
                      onClose={onClose}
                      isItemActive={isItemActive}
                    />
                  );
                }

                // Expanded Pinned Bottom Item (e.g. Settings / Refer & Earn)
                return (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex items-center">
                      {hasChildren ? (
                        <div
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                            active && !hasActive
                              ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm"
                              : hasActive
                              ? "bg-slate-100/80 text-[#181e25]"
                              : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          onClick={() => toggleItemExpanded(item.id)}
                        >
                          <Link
                            to={item.path || "#"}
                            onClick={(e) => {
                              if (!item.path) {
                                e.preventDefault();
                                toggleItemExpanded(item.id);
                              } else {
                                onClose();
                              }
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <Icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                active && !hasActive
                                  ? "text-white"
                                  : hasActive
                                  ? "text-[#181e25]"
                                  : "text-slate-500"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemExpanded(item.id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <Link
                          to={item.path || "#"}
                          onClick={onClose}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                            active
                              ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm"
                              : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              active ? "text-white" : "text-slate-500"
                            }`}
                          />
                          <span className="truncate flex-1">{item.label}</span>
                        </Link>
                      )}
                    </div>

                    {/* Expanded Children for Pinned Bottom Item (e.g. Settings children) */}
                    {hasChildren && isExpanded && (
                      <div className="ml-5 my-0.5 pl-2.5 border-l border-slate-200/80 space-y-0.5">
                        {item.children?.map((child) => {
                          const childActive = isItemActive(child);
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.id}
                              to={child.path || "#"}
                              onClick={onClose}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                childActive
                                  ? "bg-[#181e25] text-white shadow-2xs font-bold"
                                  : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                              }`}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <ChildIcon
                                className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  childActive ? "text-white" : "text-slate-400"
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
          ))}
        </div>
      </aside>
    </>
  );
}
