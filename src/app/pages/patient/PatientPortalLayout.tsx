import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  QrCode,
  Calendar,
  Pill,
  Receipt,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  User,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useClients, getStoredClients, saveStoredClients, Client, CLIENTS_STORE_EVENT } from "../../../lib/clientsStore";
import {
  getStoredProcesses,
  getProcessesForPatientPortal,
  DEMO_PATIENT_PORTAL_PROCESS,
  DEMO_PATIENT_PORTAL_PROCESS_ID,
  Process,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";

export const STAGE_ROUTES: Record<string, string> = {
  "Client Checked In": "/patient/checkin",
  "Book Appointment": "/patient/book",
  "Move to Pharmacy": "/patient/pharmacy",
  "Pay Bill": "/patient/bill",
  "Payment Done": "/patient/pay",
};

export default function PatientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, setClients } = useClients();

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

  const navLinks = [
    { to: "/patient", label: "Care Status", icon: Activity, exact: true },
    { to: "/patient/checkin", label: "1. QR Check-In", icon: QrCode },
    { to: "/patient/book", label: "2. Book Appt", icon: Calendar },
    { to: "/patient/pharmacy", label: "3. Pharmacy", icon: Pill },
    { to: "/patient/bill", label: "4. Pay Bill", icon: Receipt },
    { to: "/patient/pay", label: "5. Pay QR", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1D4ED8]">
      {/* Top Clinical Glass Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Surface Tag */}
            <div className="flex items-center gap-3">
              <NavLink to="/patient" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-[#3B82F6] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    MantraCare
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      Patient Portal
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 hidden sm:block">
                    Connected to Real MantraAssist Data Layer
                  </div>
                </div>
              </NavLink>
            </div>

            {/* Center Status / Patient Switcher */}
            <div className="flex items-center gap-3">
              {/* Canonical Store Live Sync Badge */}
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Reactive Canonical Sync</span>
              </div>

              {/* Patient Switcher for Testing & Verification */}
              <div className="flex items-center gap-2 bg-slate-100/90 rounded-xl px-3 py-1.5 border border-slate-200/70">
                <User className="w-4 h-4 text-slate-500" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Patient Profile
                  </span>
                  <select
                    value={activeClient?.id}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent border-0 outline-none cursor-pointer pr-4"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id}) — {c.stage || "No Stage"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cross-Surface Links */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate("/reception")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Open AI Receptionist in new view"
                >
                  Receptionist
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/clients")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Open MantraAssist Staff Dashboard"
                >
                  Dashboard
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Breadcrumb Stepper Strip */}
        <div className="bg-slate-50/90 border-t border-slate-200/60 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 text-xs min-w-[700px]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Process:
              </span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                {activeProcess.name}
              </span>
            </div>

            {/* 5 Stages Sequence Indicator */}
            <div className="flex items-center gap-2">
              {stages.map((st, idx) => {
                const isPassed = idx < activeIdx;
                const isCurrent = idx === activeIdx;
                const targetRoute = STAGE_ROUTES[st.name] || "/patient";

                return (
                  <React.Fragment key={st.id || idx}>
                    <button
                      type="button"
                      onClick={() => navigate(targetRoute)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-left ${
                        isCurrent
                          ? "bg-blue-600 text-white font-semibold shadow-xs ring-2 ring-blue-500/20"
                          : isPassed
                          ? "bg-emerald-50 text-emerald-800 font-medium hover:bg-emerald-100"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent
                              ? "bg-white text-blue-600"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      )}
                      <span className="whitespace-nowrap">{st.name}</span>
                    </button>
                    {idx < stages.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-header Bar */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>

      {/* Subtle Footer with Real-time Diagnostics */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>MantraCare Patient Care Architecture — Real Shared Stores Active</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Storage: clients / appointments_v1 / mantra_invoices_v1</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Sync
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
