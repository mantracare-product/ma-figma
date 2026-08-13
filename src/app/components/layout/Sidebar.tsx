import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Phone,
  GitBranch,
  Building2,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sliders,
  Shield,
  Briefcase,
  UserCog,
  User,
  LogOut,
  FileText,
  Package,
  Calendar as CalendarIcon,
  Workflow,
  MessageCircle,
  Database,
  Gift,
  Receipt,
  BarChart3,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import logo from "../../../imports/ma_logo-1.png";
import { TeamMemberDrawer } from "../TeamMemberDrawer";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreItems, setShowMoreItems] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully");
    setShowProfileMenu(false);
    onClose();
    navigate("/login");
  };

  const visibleLinks = [
    { path: "/", label: "Overview", icon: LayoutDashboard },
    { path: "/clients", label: "Clients", icon: Users },
    { path: "/deals", label: "Processes", icon: Workflow },
    { path: "/call-logs", label: "Calls", icon: Phone },
    { path: "/chats", label: "Chats", icon: MessageCircle },
    { path: "/invoices", label: "Invoices", icon: Receipt },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/knowledge-base", label: "Knowledge Base", icon: Database },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const collapsibleLinks = [
    { path: "/process", label: "Process Settings", icon: Sliders },
    { path: "/web-forms", label: "Web Forms", icon: FileText },
    { path: "/appointments", label: "Appointments", icon: CalendarIcon },
    { path: "/services", label: "Product & Services", icon: Package },
    { path: "/refer-and-earn", label: "Refer & Earn", icon: Gift },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 transition-all duration-200 ease-in-out ${collapsed ? "w-20" : "w-64"
          } ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <div className="h-full flex flex-col relative">
          {/* Logo */}
          <div
            className={`p-5 flex items-center ${collapsed ? "justify-center" : ""}`}
            style={{ borderBottom: "1px solid var(--sidebar-border)" }}
          >
            <Link to="/" className="block">
              <img
                src={logo}
                alt=""
                className={`transition-all duration-200 ${collapsed ? "h-8 w-auto object-contain" : "h-8 w-auto"
                  }`}
                style={{ maxWidth: collapsed ? '40px' : '180px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </Link>
          </div>

          {/* Floating Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex absolute top-16 ${collapsed ? "-right-3" : "-right-3"
              } w-6 h-6 items-center justify-center rounded-full shadow-[0px_2px_6px_rgba(0,0,0,0.08)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 z-10`}
            style={{
              backgroundColor: "var(--sidebar-bg)",
              border: "1px solid var(--sidebar-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--sidebar-bg)";
            }}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--sidebar-icon)" }} />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: "var(--sidebar-icon)" }} />
            )}
          </button>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {/* Always visible links */}
              {visibleLinks.map((link) => {
                const active = isActive(link.path);
                const linkContent = (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center ${collapsed ? "justify-center" : "gap-3"
                      } px-3 py-2.5 rounded-xl transition-all duration-200`}
                    style={{
                      backgroundColor: active ? "var(--sidebar-item-active-bg)" : "transparent",
                      color: active ? "var(--sidebar-item-active-text)" : "var(--sidebar-text)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <link.icon
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: active ? "var(--sidebar-icon-active)" : "var(--sidebar-icon)" }}
                    />
                    {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
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

              {/* Show more/less toggle */}
              {collapsed ? (
                <Tooltip text={showMoreItems ? "Show less" : "Show more"} placement="right">
                  <button
                    onClick={() => setShowMoreItems(!showMoreItems)}
                    className="flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200 w-full"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {showMoreItems ? (
                      <ChevronUp className="w-4 h-4" style={{ color: "var(--sidebar-text-muted)" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--sidebar-text-muted)" }} />
                    )}
                  </button>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setShowMoreItems(!showMoreItems)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm transition-all duration-200 w-full"
                  style={{ color: "var(--sidebar-text-muted)" }}
                >
                  <span>{showMoreItems ? "Show less" : "Show more"}</span>
                  {showMoreItems ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Collapsible links */}
              {showMoreItems && collapsibleLinks.map((link) => {
                const active = isActive(link.path);
                const linkContent = (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center ${collapsed ? "justify-center" : "gap-3"
                      } px-3 py-2.5 rounded-xl transition-all duration-200`}
                    style={{
                      backgroundColor: active ? "var(--sidebar-item-active-bg)" : "transparent",
                      color: active ? "var(--sidebar-item-active-text)" : "var(--sidebar-text)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <link.icon
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: active ? "var(--sidebar-icon-active)" : "var(--sidebar-icon)" }}
                    />
                    {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
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
            </div>
          </nav>

          {/* Profile Section */}
          <div className="p-4" style={{ borderTop: "1px solid var(--sidebar-border)", backgroundColor: "var(--sidebar-profile-bg)" }}>
            <div className="relative">
              {collapsed ? (
                <Tooltip text="Admin User" placement="right">
                  <button
                    onClick={() => {
                      setIsProfileDrawerOpen(true);
                      onClose();
                    }}
                    className="flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200 w-full"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                        color: "var(--text-inverse)",
                      }}
                    >
                      A
                    </div>
                  </button>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: "var(--accent-primary)",
                      color: "var(--text-inverse)",
                    }}
                  >
                    A
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: "var(--sidebar-text)" }}>Admin User</p>
                    <p className="text-xs" style={{ color: "var(--sidebar-text-muted)" }}>admin@healthcare.com</p>
                  </div>
                </button>
              )}

              {showProfileMenu && (
                <div
                  className={`absolute ${collapsed ? "left-full ml-2 bottom-0" : "left-0 bottom-full mb-2"
                    } w-48 rounded-xl shadow-lg py-2 z-50`}
                  style={{
                    backgroundColor: "var(--bg-dropdown)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsProfileDrawerOpen(true);
                      onClose();
                    }}
                    className="w-full px-4 py-2 text-left transition-colors flex items-center gap-2 text-sm"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-surface-alt)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <div className="my-2" style={{ borderTop: "1px solid var(--border-default)" }} />
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left transition-colors flex items-center gap-2 text-sm"
                    style={{ color: "var(--status-error)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-surface-alt)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Profile Drawer — reuses TeamMemberDrawer with admin data */}
      <TeamMemberDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        member={{
          name: "Admin User",
          email: "admin@healthcare.com",
          phone: "+1 (555) 123-4567",
          role: "Admin",
        }}
      />
    </>
  );
}
