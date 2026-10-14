import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation, useParams } from "react-router";
import {
  Calendar,
  Receipt,
  User,
  ChevronsUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  LogOut,
  Building2,
  Sparkles,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import maLogo from "../../../imports/ma_logo-1.png";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { useClients, getStoredClients, saveStoredClients, Client, CLIENTS_STORE_EVENT } from "../../../lib/clientsStore";
import { updateProcessCallLogStage } from "../../../lib/processLogsStore";
import {
  getProcessesForPatientPortal,
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

  // If on login screen, render without portal wrapper/sidebar
  const isAuthPage = location.pathname === "/patient/login";

  const [isDevSwitcherOpen, setIsDevSwitcherOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
    toast.success("Signed out successfully");
    navigate("/patient/login");
  };

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

  // Selected patient state (persisted in sessionStorage)
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (routeClientId) return routeClientId;
    const pathParts = window.location.pathname.split("/patient/");
    if (pathParts[1] && !["login", "book", "documents", "pharmacy", "bill", "pay", "status"].includes(pathParts[1])) {
      return pathParts[1];
    }
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get("clientId") || params.get("id");
    if (paramId) return paramId;
    return sessionStorage.getItem("patient_portal_active_client_id") || localStorage.getItem("patient_portal_active_client_id") || "CL-001";
  });

  // Watch URL params / path for client ID
  useEffect(() => {
    if (routeClientId && routeClientId !== selectedClientId) {
      setSelectedClientId(routeClientId);
      sessionStorage.setItem("patient_portal_active_client_id", routeClientId);
      localStorage.setItem("patient_portal_active_client_id", routeClientId);
    } else {
      const pathParts = location.pathname.split("/patient/");
      if (pathParts[1] && !["login", "book", "documents", "pharmacy", "bill", "pay", "status"].includes(pathParts[1])) {
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
    localStorage.setItem("patient_portal_active_client_id", id);
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: id }));
    navigate(`/patient/${id}`);
  };

  const activeProcess = portalProcesses.find(
    (p) =>
      Boolean(p.connectedToPatientPortal) &&
      activeClient?.processes?.some((pNameOrId) => pNameOrId === p.name || pNameOrId === p.id)
  );

  const stages = activeProcess?.stages || [];
  const currentStageName = activeClient?.stage;
  const currentStageIndex = currentStageName
    ? stages.findIndex(
        (s) =>
          s.name.toLowerCase() === currentStageName.toLowerCase() ||
          s.id.toLowerCase() === currentStageName.toLowerCase()
      )
    : -1;
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : -1;

  // If on login screen, render without portal wrapper/sidebar
  if (isAuthPage) {
    return <Outlet />;
  }

  const isOverviewPage = location.pathname === "/patient" || location.pathname === "/patient/" || (routeClientId && location.pathname === `/patient/${routeClientId}`);
  const isSubPage = !isOverviewPage;
  const overviewPath = activeClient?.id ? `/patient/${activeClient.id}` : "/patient";

  const navItems = [
    { to: overviewPath, label: "Today", icon: LayoutDashboard, exact: true },
    { to: "/patient/book", label: "Visits", icon: Calendar },
    { to: "/patient/documents", label: "Documents", icon: FileText },
    { to: "/patient/bill", label: "Billing", icon: Receipt },
    { to: "/patient/profile", label: "Profile", icon: User },
  ];

  const clientInitials = (activeClient.name || "Patient")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#E0E7FF] selection:text-[#1D4ED8]">
      {/* ── Desktop & Tablet Sidebar (Slim, Modern, Navodya-Styled) ── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 h-full select-none z-30 shrink-0 relative transition-[width] duration-250 ease-in-out ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Collapse / Expand floating button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all z-40 cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center border-b border-slate-100 shrink-0 justify-between">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <img src={symbolLogo} alt="MantraAssist" className="h-7 w-7 object-contain" />
            </button>
          ) : (
            <NavLink to={overviewPath} className="flex items-center gap-2.5">
              <img src={maLogo} alt="MantraAssist" className="h-6 w-auto object-contain" />
              <div className="h-4 w-px bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                Companion
              </span>
            </NavLink>
          )}
        </div>

        {/* Organization Badge & Dropdown */}
        <div className="p-3" ref={orgMenuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className={`w-full flex items-center rounded-2xl p-2.5 transition-all cursor-pointer ${
                collapsed
                  ? "justify-center bg-slate-50 hover:bg-slate-100"
                  : "justify-between bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/70"
              }`}
              title={activeOrganization?.name || "Demo Mantra Care"}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "M"}
                </div>
                {!collapsed && (
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                      Clinic
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {activeOrganization?.name || "Demo Mantra Care"}
                    </span>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {/* Org Switcher Menu */}
            {showOrgDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Switch Clinic
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
                        <div className="w-5 h-5 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
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

        {/* Primary Navigation Links */}
        <div className={`flex-1 overflow-y-auto py-2 space-y-1.5 ${collapsed ? "px-2.5 flex flex-col items-center" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl text-xs font-bold transition-all relative ${
                    collapsed
                      ? "w-11 h-11 justify-center"
                      : "justify-between px-3.5 py-3"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`
                }
                title={item.label}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Profile & Dev Switcher Footer */}
        <div className="p-3 border-t border-slate-100 bg-white relative space-y-2" ref={userMenuRef}>
          {/* Dev Switcher Pill */}
          <button
            type="button"
            onClick={() => setIsDevSwitcherOpen(true)}
            className={`w-full py-2 px-2.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 text-[11px] font-bold flex items-center transition-colors cursor-pointer ${
              collapsed ? "justify-center" : "justify-between"
            }`}
            title="Fast switch patient profile (Dev tool)"
          >
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {!collapsed && <span>Switch Patient</span>}
            </div>
            {!collapsed && <span className="text-[9px] uppercase tracking-wider font-mono bg-amber-200/80 px-1.5 py-0.2 rounded-md">Dev</span>}
          </button>

          {/* User Upward Dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate("/patient/profile");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Profile Settings</span>
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
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Patient Card Trigger */}
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center p-2 rounded-2xl hover:bg-slate-100/80 transition-all cursor-pointer group ${
              collapsed ? "justify-center" : "justify-between"
            }`}
            aria-label="Patient user menu"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {clientInitials}
              </div>
              {!collapsed && (
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {activeClient.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    #{activeClient.id}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />}
          </button>
        </div>
      </aside>

      {/* ── Main Viewport Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Brand / Hospital Badge */}
            <div className="md:hidden flex items-center gap-2">
              <img src={maLogo} alt="MantraAssist" className="h-6 w-auto object-contain" />
              <div className="h-3 w-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                {activeOrganization?.name || "Mantra Care"}
              </span>
            </div>

            {/* Desktop Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Patient Companion</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-900">
                {location.pathname.includes("profile")
                  ? "Profile"
                  : location.pathname.includes("book")
                  ? "Visits"
                  : location.pathname.includes("bill") || location.pathname.includes("pay")
                  ? "Billing"
                  : location.pathname.includes("documents")
                  ? "Documents"
                  : location.pathname.includes("pharmacy")
                  ? "Dispensary & Pharmacy"
                  : "Today"}
              </span>
            </div>
          </div>

          {/* Right Header: Back link on sub-pages + Mobile Dev Switcher */}
          <div className="flex items-center gap-2.5">
            {isSubPage && (
              <NavLink
                to={overviewPath}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors px-2 py-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Today</span>
              </NavLink>
            )}

            {/* Mobile Dev Patient Switcher Trigger */}
            <button
              type="button"
              onClick={() => setIsDevSwitcherOpen(true)}
              className="md:hidden p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center gap-1"
              title="Dev: Switch Patient"
            >
              <FlaskConical className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ── Main Scrollable Viewport (with bottom padding for mobile bar) ── */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto w-full">
            <Outlet
              context={{
                activeClient,
                activeProcess,
                currentStageName,
                currentStageIndex: activeIdx,
                stages,
                onStageChange: (newStageName: string) => {
                  if (!activeClient) return;
                  const procName = activeProcess?.name || "Patient Care Journey";
                  const cid = String(activeClient.id);
                  const all = getStoredClients();
                  const updated = all.map((c) =>
                    c.id === activeClient.id
                      ? {
                          ...c,
                          stage: newStageName,
                          lastUpdatedProcess: procName,
                          processStagesMap: { ...(c.processStagesMap || {}), [procName]: newStageName },
                          processes: Array.from(new Set([procName, ...(c.processes || [])])),
                        }
                      : c
                  );
                  saveStoredClients(updated);
                  updateProcessCallLogStage(cid, procName, newStageName);
                  window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: cid }));
                  window.dispatchEvent(new CustomEvent(CLIENTS_STORE_EVENT, { detail: updated }));
                },
              }}
            />
          </div>
        </main>

        {/* ── Mobile Fixed Bottom Navigation Bar (4-Tab Thumb Layout) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 flex items-center justify-around px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-2xl transition-all ${
                    isActive
                      ? "text-blue-600 font-bold"
                      : "text-slate-400 font-medium hover:text-slate-600"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-9 h-7 rounded-xl flex items-center justify-center transition-all ${
                        isActive ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] tracking-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
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
