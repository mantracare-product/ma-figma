import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation, useParams } from "react-router";
import {
  QrCode,
  Calendar,
  Pill,
  Receipt,
  CheckCircle2,
  ExternalLink,
  User,
  ChevronsUpDown,
  Check,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import maLogo from "../../../imports/ma_logo-1.png";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { useClients, getStoredClients, saveStoredClients, Client, CLIENTS_STORE_EVENT } from "../../../lib/clientsStore";
import {
  getProcessesForPatientPortal,
  DEMO_PATIENT_PORTAL_PROCESS,
  DEMO_PATIENT_PORTAL_PROCESS_ID,
  Process,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";
import { useOrganization } from "../../context/OrganizationContext";
import DevPatientSwitcherModal from "./components/DevPatientSwitcherModal";

export const STAGE_ROUTES: Record<string, string> = {
  "Client Checked In": "/patient/book",
  "Book Appointment": "/patient/book",
  "Move to Pharmacy": "/patient/pharmacy",
  "Pay Bill": "/patient/bill",
  "Payment Done": "/patient/pay",
};

export default function PatientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId: routeClientId } = useParams<{ clientId?: string }>();
  const { clients } = useClients();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();

  // If on login or register screen, render without portal wrapper/sidebar
  const isAuthPage = location.pathname === "/patient/login" || location.pathname === "/patient/register";

  const [isDevSwitcherOpen, setIsDevSwitcherOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close org dropdown or user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("patient_portal_active_client_id");
    localStorage.removeItem("patient_portal_active_client_id");
    toast.success("Logged out successfully");
    navigate("/patient/login");
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Find active processes connected to Patient Portal
  const [portalProcesses, setPortalProcesses] = useState<Process[]>(() => getProcessesForPatientPortal());

  useEffect(() => {
    const handleProcesses = () => {
      setPortalProcesses(getProcessesForPatientPortal());
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleProcesses);
    window.addEventListener("storage", handleProcesses);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleProcesses);
      window.removeEventListener("storage", handleProcesses);
    };
  }, []);

  const activeProcess =
    portalProcesses.find((p) => p.id === DEMO_PATIENT_PORTAL_PROCESS_ID || p.name === "Patient Care Journey") ||
    portalProcesses[0] ||
    DEMO_PATIENT_PORTAL_PROCESS;

  // Selected patient state (persisted in sessionStorage)
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (routeClientId) return routeClientId;
    const pathParts = window.location.pathname.split("/patient/");
    if (pathParts[1] && !["login", "register", "checkin", "book", "documents", "pharmacy", "bill", "pay", "status"].includes(pathParts[1])) {
      return pathParts[1];
    }
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get("clientId") || params.get("id");
    if (paramId) return paramId;
    return sessionStorage.getItem("patient_portal_active_client_id") || "CL-001";
  });

  // Watch URL params / path for client ID
  useEffect(() => {
    if (routeClientId && routeClientId !== selectedClientId) {
      setSelectedClientId(routeClientId);
      sessionStorage.setItem("patient_portal_active_client_id", routeClientId);
    } else {
      const pathParts = location.pathname.split("/patient/");
      if (pathParts[1] && !["login", "register", "checkin", "book", "documents", "pharmacy", "bill", "pay", "status"].includes(pathParts[1])) {
        if (pathParts[1] !== selectedClientId) {
          setSelectedClientId(pathParts[1]);
          sessionStorage.setItem("patient_portal_active_client_id", pathParts[1]);
        }
      }
    }
    const params = new URLSearchParams(location.search);
    const paramId = params.get("clientId") || params.get("id");
    if (paramId && paramId !== selectedClientId) {
      setSelectedClientId(paramId);
      sessionStorage.setItem("patient_portal_active_client_id", paramId);
    }
  }, [routeClientId, location.pathname, location.search, selectedClientId]);

  // Listen for patient_portal_client_changed events (fired when user registers or switches patient)
  useEffect(() => {
    const handlePortalClientChange = (e?: any) => {
      const targetId = e?.detail || sessionStorage.getItem("patient_portal_active_client_id") || localStorage.getItem("patient_portal_active_client_id");
      if (targetId) {
        setSelectedClientId(targetId);
      }
    };
    window.addEventListener("patient_portal_client_changed", handlePortalClientChange);
    window.addEventListener("storage", handlePortalClientChange);
    return () => {
      window.removeEventListener("patient_portal_client_changed", handlePortalClientChange);
      window.removeEventListener("storage", handlePortalClientChange);
    };
  }, []);

  const normalizedSelectedId = (selectedClientId || "").trim().toLowerCase().replace(/^#/, "");

  const activeClient: Client =
    clients.find((c) => {
      const cId = (c.id || "").trim().toLowerCase().replace(/^#/, "");
      return cId === normalizedSelectedId;
    }) ||
    clients[0] || {
      id: "CL-001",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1 (555) 123-4567",
      country: "US",
      countryCode: "+1",
      countryFlag: "🇺🇸",
      processes: ["Patient Care Journey"],
      stage: "Client Checked In",
      responsible: "Dr. John Smith",
      lastContact: new Date().toISOString().split("T")[0],
      status: "Active",
    };

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    sessionStorage.setItem("patient_portal_active_client_id", id);
    navigate(`/patient/${id}`);
  };

  const stages = activeProcess?.stages || DEMO_PATIENT_PORTAL_PROCESS.stages;
  const currentStageName = activeClient?.stage || "Client Checked In";
  const currentStageIndex = stages.findIndex(
    (s) => s.name.toLowerCase() === currentStageName.toLowerCase() || s.id.toLowerCase() === currentStageName.toLowerCase()
  );
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : 0;

  // If on login or register screen, render without portal wrapper/sidebar
  if (isAuthPage) {
    return <Outlet />;
  }

  const isOverviewPage = location.pathname === "/patient" || location.pathname === "/patient/" || (routeClientId && location.pathname === `/patient/${routeClientId}`);
  const isSubPage = !isOverviewPage;

  const overviewPath = activeClient?.id ? `/patient/${activeClient.id}` : "/patient";

  const navItems = [
    { to: overviewPath, label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/patient/checkin", label: "Check In", icon: QrCode },
    { to: "/patient/book", label: "Appointments", icon: Calendar },
    { to: "/patient/documents", label: "Documents", icon: FileText },
    { to: "/patient/bill", label: "Billing", icon: Receipt },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#E0E7FF] selection:text-[#1D4ED8]">
      {/* ── Desktop & Tablet Docked Sidebar (Collapsible & Expandable) ── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/90 h-full select-none z-30 shrink-0 relative transition-[width] duration-300 ease-in-out ${
          collapsed
            ? "w-[68px] min-w-[68px] max-w-[68px]"
            : "w-64 min-w-[256px] max-w-[256px]"
        }`}
      >
        {/* Floating Collapse/Expand Toggle Button on dividing border */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-2.5 top-[58px] w-5 h-5 rounded-full bg-white border border-slate-200/90 shadow-xs hover:shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all z-40 cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-slate-600" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-slate-600" />
          )}
        </button>

        {/* Top Brand Logo */}
        <div className="h-14 px-3 flex items-center border-b border-slate-200/80 shrink-0 justify-between">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              title="Expand sidebar"
            >
              <img
                src={symbolLogo}
                alt="MantraAssist"
                className="h-7 w-7 object-contain transition-transform hover:scale-105"
              />
            </button>
          ) : (
            <NavLink to={overviewPath} className="flex items-center gap-2 group">
              <img
                src={maLogo}
                alt="MantraAssist"
                className="h-6 w-auto object-contain transition-transform group-hover:scale-102"
              />
              <div className="h-4 w-px bg-slate-300" />
              <span className="text-xs font-bold text-slate-600 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                Client Portal
              </span>
            </NavLink>
          )}
        </div>

        {/* Organization Switcher Card */}
        {collapsed ? (
          <div className="p-3 flex justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-2xs hover:ring-2 hover:ring-blue-500/30 transition-all cursor-pointer"
              title={`Organization: ${activeOrganization?.name || "Demo Mantra Care"}`}
            >
              {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "M"}
            </button>
          </div>
        ) : (
          <div className="p-3 pb-2" ref={orgMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 hover:border-slate-300 rounded-xl p-2.5 px-3 flex items-center justify-between shadow-2xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "M"}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                      Organization
                    </span>
                    <span
                      className="text-xs font-bold text-slate-900 truncate mt-0.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {activeOrganization?.name || "Demo Mantra Care"}
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </button>

              {/* Organization Dropdown */}
              {showOrgDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                    Organizations
                  </p>
                  {organizations.map((org) => {
                    const isCurrent = activeOrganization?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          setActiveOrganization(org);
                          setShowOrgDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isCurrent ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-md bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{org.name}</span>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portal Services Navigation Items */}
        <div className={`flex-1 overflow-y-auto py-3 space-y-1 ${collapsed ? "px-2 flex flex-col items-center" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all relative ${
                    collapsed
                      ? "w-10 h-10 justify-center"
                      : "justify-between px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`
                }
                title={item.label}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* ── Bottom Profile Footer (Matching Mantra Assist Admin) ── */}
        <div className="p-2.5 border-t border-slate-200/80 bg-white relative" ref={userMenuRef}>
          {/* Upward Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate(overviewPath);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Profile</span>
              </button>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          {/* User Card Trigger Button */}
          {collapsed ? (
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 mx-auto rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-800 transition-all cursor-pointer"
              title={`${activeClient.name} — Click for options`}
            >
              {(activeClient.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 transition-all cursor-pointer group"
              aria-label="Patient user menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {(activeClient.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span
                    className="text-xs font-bold text-slate-900 truncate group-hover:text-black"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {activeClient.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono truncate">
                    #{activeClient.id}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Drawer Sidebar ── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 max-w-[80vw] bg-white border-r border-slate-200 h-full shadow-2xl z-50">
            {/* Top Logo & Close */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <NavLink to={overviewPath} className="flex items-center gap-2">
                <img src={maLogo} alt="MantraAssist" className="h-6 w-auto object-contain" />
                <div className="h-4 w-px bg-slate-300" />
                <span className="text-xs font-bold text-slate-600 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Client Portal
                </span>
              </NavLink>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Org Card */}
            <div className="p-3">
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "M"}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Organization
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {activeOrganization?.name || "Demo Mantra Care"}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Nav Items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>

            {/* Mobile Bottom Profile & Logout */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(activeClient.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {activeClient.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    #{activeClient.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Viewport Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Ultra-Clean Top Bar ── */}
        <header className="h-14 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile logo when sidebar is hidden */}
            <div className="md:hidden flex items-center gap-2">
              <img src={maLogo} alt="MantraAssist" className="h-6 w-auto object-contain" />
            </div>

            {/* Desktop Page Breadcrumb / Title */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Patient Portal</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">
                {isSubPage
                  ? location.pathname.includes("book")
                    ? "Appointments"
                    : location.pathname.includes("bill")
                    ? "Billing"
                    : location.pathname.includes("checkin")
                    ? "Check In"
                    : location.pathname.includes("documents")
                    ? "Documents"
                    : location.pathname.includes("pharmacy")
                    ? "Pharmacy"
                    : "Overview"
                  : "Overview"}
              </span>
            </div>
          </div>

          {/* Right Header: Sub-page back navigation only (Dev Switcher & patient button removed) */}
          <div className="flex items-center gap-2">
            {isSubPage && (
              <NavLink
                to={overviewPath}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors pl-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Overview</span>
              </NavLink>
            )}
          </div>
        </header>

        {/* ── Main Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto w-full">
            <Outlet
              context={{
                activeClient,
                activeProcess,
                currentStageName,
                currentStageIndex: activeIdx,
                stages,
                onStageChange: (newStageName: string) => {
                  if (!activeClient) return;
                  const all = getStoredClients();
                  const updated = all.map((c) =>
                    c.id === activeClient.id
                      ? {
                          ...c,
                          stage: newStageName,
                          processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])),
                        }
                      : c
                  );
                  saveStoredClients(updated);
                },
              }}
            />
          </div>
        </main>
      </div>

      {/* Dev Patient Switcher Modal */}
      <DevPatientSwitcherModal
        isOpen={isDevSwitcherOpen}
        onClose={() => setIsDevSwitcherOpen(false)}
        onSelectPatient={(id) => handleSelectClient(id)}
        activePatientId={activeClient.id}
      />
    </div>
  );
}
