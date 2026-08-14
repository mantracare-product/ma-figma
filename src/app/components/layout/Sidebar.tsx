import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutGrid,
  Users,
  RefreshCw,
  Phone,
  Calendar as CalendarIcon,
  Settings,
  LogOut,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Package,
  Gift,
  Receipt,
  BarChart3,
  MessageCircle,
  Database,
  Sliders,
  Check,
  Plus,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { useOrganization } from "../../context/OrganizationContext";
import logo from "../../../imports/ma_logo-1.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showMoreItems, setShowMoreItems] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
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

  // Primary 6 navigation items matching reference screenshot
  const primaryLinks = [
    { path: "/", label: "Overview", icon: LayoutGrid },
    { path: "/clients", label: "Clients", icon: Users },
    { path: "/deals", label: "Processes", icon: RefreshCw },
    { path: "/call-logs", label: "Call Logs", icon: Phone },
    { path: "/appointments", label: "Appointments", icon: CalendarIcon },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Secondary modules accessible via dropdown
  const secondaryLinks = [
    { path: "/chats", label: "Chats", icon: MessageCircle },
    { path: "/invoices", label: "Invoices", icon: Receipt },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/knowledge-base", label: "Knowledge Base", icon: Database },
    { path: "/process", label: "Process Settings", icon: Sliders },
    { path: "/web-forms", label: "Web Forms", icon: FileText },
    { path: "/services", label: "Product/Services", icon: Package },
    { path: "/refer-and-earn", label: "Refer & Earn", icon: Gift },
  ];

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
        className={`fixed lg:sticky top-0 h-screen z-50 transition-all duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } bg-white border-r border-slate-200/80 shadow-xs flex flex-col justify-between flex-shrink-0 relative select-none`}
      >
        {/* Floating Sidebar Toggle Button (Matching User Screenshot) */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden lg:flex absolute top-5 -right-3.5 w-7 h-7 rounded-full bg-white border border-slate-900 shadow-md hover:shadow-lg items-center justify-center text-slate-900 hover:bg-slate-50 transition-all duration-200 z-50 cursor-pointer active:scale-95"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-slate-900" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 text-slate-900" />
          )}
        </button>

        {/* ── Top Area ── */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide flex-1">
          {/* Logo Header */}
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <Link to="/" onClick={onClose} className="flex items-center gap-2">
              {collapsed ? (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#1456f0]">
                  <img src={logo} alt="MantraAssist" className="w-7 h-7 object-contain" />
                </div>
              ) : (
                <div className="flex items-center">
                  <span
                    className="text-2xl font-extrabold tracking-tight text-[#0f172a]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span className="text-[#1456f0]">M</span>antra
                  </span>
                  <span
                    className="text-2xl font-light tracking-tight text-[#0284c7]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Assist
                  </span>
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
                        to="/settings?tab=organization"
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

          {/* ── Navigation Links ── */}
          <nav className="space-y-1.5 pt-1">
            {primaryLinks.map((link) => {
              const active = isActive(link.path);
              const linkContent = (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={`relative flex items-center ${
                    collapsed ? "justify-center p-2.5 rounded-xl" : "gap-3.5 px-4 py-3 rounded-2xl"
                  } text-sm font-semibold transition-all duration-150 ${
                    active
                      ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm"
                      : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <link.icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={link.path} text={link.label} placement="right">
                  {linkContent}
                </Tooltip>
              ) : (
                linkContent
              );
            })}

            {/* Collapsible Secondary Modules */}
            {!collapsed && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreItems(!showMoreItems)}
                  className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <span>More Modules</span>
                  {showMoreItems ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <AnimatePresence>
                  {showMoreItems && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden pt-1"
                    >
                      {secondaryLinks.map((link) => {
                        const active = isActive(link.path);
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                              active
                                ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-2xs"
                                : "text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60"
                            }`}
                          >
                            <link.icon
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                active ? "text-white" : "text-slate-400"
                              }`}
                            />
                            <span className="truncate">{link.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>

        {/* ── Bottom Sign Out Bar ── */}
        <div className="p-3 border-t border-slate-100">
          {collapsed ? (
            <Tooltip text="Sign Out" placement="right">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-sm font-semibold text-[#45515e] hover:text-rose-600 hover:bg-rose-50/70 transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
