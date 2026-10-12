import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
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
} from "lucide-react";
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
  const { clients } = useClients();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  // Close org dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) {
        setShowOrgDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get("clientId") || params.get("id");
    if (paramId) return paramId;
    return sessionStorage.getItem("patient_portal_active_client_id") || "CL-001";
  });

  // Watch URL params for client ID
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramId = params.get("clientId") || params.get("id");
    if (paramId && paramId !== selectedClientId) {
      setSelectedClientId(paramId);
      sessionStorage.setItem("patient_portal_active_client_id", paramId);
    }
  }, [location.search, selectedClientId]);

  const activeClient: Client =
    clients.find((c) => c.id === selectedClientId) ||
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
    const params = new URLSearchParams(location.search);
    if (params.has("clientId") || params.has("id")) {
      params.set("clientId", id);
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  };

  const stages = activeProcess?.stages || DEMO_PATIENT_PORTAL_PROCESS.stages;
  const currentStageName = activeClient?.stage || "Client Checked In";
  const currentStageIndex = stages.findIndex(
    (s) => s.name.toLowerCase() === currentStageName.toLowerCase() || s.id.toLowerCase() === currentStageName.toLowerCase()
  );
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : 0;

  const isSubPage = location.pathname !== "/patient" && location.pathname !== "/patient/";

  // Primary action button in the sidebar based on where the patient is
  const getSidebarQuickAction = () => {
    switch (currentStageName) {
      case "Client Checked In":
        return { label: "Book Appointment", icon: Calendar, to: "/patient/book" };
      case "Book Appointment":
        return { label: "Go to Pharmacy", icon: Pill, to: "/patient/pharmacy" };
      case "Move to Pharmacy":
        return { label: "Review Bill", icon: Receipt, to: "/patient/bill" };
      case "Pay Bill":
        return { label: "Complete Payment", icon: CheckCircle2, to: "/patient/pay" };
      case "Payment Done":
        return { label: "View Receipt", icon: Receipt, to: "/patient/pay" };
      default:
        return { label: "Book Appointment", icon: Calendar, to: "/patient/book" };
    }
  };

  const quickAction = getSidebarQuickAction();
  const QuickActionIcon = quickAction.icon;

  const navItems = [
    { to: "/patient", label: "Care Status", icon: LayoutDashboard, exact: true },
    {
      to: "/patient/checkin",
      label: "Check-In Pass",
      icon: QrCode,
      badge: "✓ Done",
    },
    {
      to: "/patient/book",
      label: "Book Appointment",
      icon: Calendar,
      badge: currentStageName === "Client Checked In" ? "Next" : undefined,
    },
    { to: "/patient/pharmacy", label: "Pharmacy", icon: Pill },
    { to: "/patient/bill", label: "Pay Bill", icon: Receipt },
    { to: "/patient/pay", label: "Payment Done", icon: CheckCircle2 },
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
            <NavLink to="/patient" className="flex items-center gap-2.5 group">
              <img
                src={maLogo}
                alt="MantraAssist"
                className="h-7 w-auto object-contain transition-transform group-hover:scale-102"
              />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wide">
                Portal
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

        {/* Dynamic Action Button (Book Appointment / Next Action) */}
        <div className={collapsed ? "px-3 pb-3 flex justify-center" : "px-3 pb-3"}>
          <button
            type="button"
            onClick={() => navigate(quickAction.to)}
            className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
              collapsed
                ? "w-10 h-10 p-0"
                : "w-full py-2.5 px-3"
            }`}
            title={quickAction.label}
          >
            <QuickActionIcon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{quickAction.label}</span>}
          </button>
        </div>

        {/* Care Protocol Navigation Items */}
        <div className={`flex-1 overflow-y-auto py-1 space-y-1 ${collapsed ? "px-2 flex flex-col items-center" : "px-3"}`}>
          {!collapsed && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              Care Protocol
            </div>
          )}
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
                      : "justify-between px-3 py-2"
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
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      item.badge.includes("Done")
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : "bg-blue-50 text-blue-700 border border-blue-200/60"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Patient Profile Section */}
        {collapsed ? (
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              title={`Active Patient: ${activeClient.name} (${activeClient.id})`}
            >
              <User className="w-4 h-4" />
            </button>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              title="Store Live Sync Active"
            />
          </div>
        ) : (
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 space-y-2">
            {/* Patient Selector */}
            <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    Active Patient
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {activeClient.name}
                  </span>
                </div>
              </div>

              <select
                value={activeClient?.id}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1 px-2 outline-none cursor-pointer"
                aria-label="Select Patient"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Sync Status & Reception Links */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Sync</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => navigate("/reception")}
                  className="hover:text-slate-800 transition-colors"
                  title="AI Receptionist"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/clients")}
                  className="hover:text-slate-800 transition-colors"
                  title="Staff Dashboard"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
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
              <NavLink to="/patient" className="flex items-center gap-2">
                <img src={maLogo} alt="MantraAssist" className="h-7 w-auto object-contain" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                  Portal
                </span>
              </NavLink>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                  <span className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {activeOrganization?.name || "Demo Mantra Care"}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Next Step Button */}
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => {
                  navigate(quickAction.to);
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              >
                <QuickActionIcon className="w-4 h-4 shrink-0" />
                <span>{quickAction.label}</span>
              </button>
            </div>

            {/* Mobile Nav Items */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.badge.includes("Done")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-blue-50 text-blue-700 border border-blue-200/60"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Mobile Patient Switcher */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Active Patient
              </div>
              <select
                value={activeClient?.id}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 px-2 outline-none cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
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
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
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
                {isSubPage ? currentStageName : "Care Status Overview"}
              </span>
            </div>
          </div>

          {/* Sub-page back navigation */}
          {isSubPage && (
            <NavLink
              to="/patient"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </NavLink>
          )}
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
    </div>
  );
}
