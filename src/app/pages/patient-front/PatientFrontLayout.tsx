import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import {
  Clock,
  Calendar,
  Layers,
  FileText,
  CreditCard,
  User,
  QrCode,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import PatientFrontHome from "./PatientFrontHome";
import PatientAppointments from "./PatientAppointments";
import PatientMore, { MoreSection } from "./PatientMore";
import QRCheckinModal from "./components/QRCheckinModal";
import { findClientById } from "../../../lib/clientProcessState";
import logo from "../../../imports/ma_logo.png";

type MainTabType = "today" | "visits" | "more";

export default function PatientFrontLayout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab parsing: derive from sub-path /patient-front/:tab or ?tab= query parameter
  const pathParts = location.pathname.split("/").filter(Boolean);
  const pathSub = pathParts[1];
  const queryTab = searchParams.get("tab");

  // Determine active main tab and more section
  const determineTabs = (val?: string | null): { tab: MainTabType; section: MoreSection } => {
    const norm = (val || "").toLowerCase();
    if (norm === "today" || norm === "home" || !norm) {
      return { tab: "today", section: "documents" };
    }
    if (norm === "visits" || norm === "appointments") {
      return { tab: "visits", section: "documents" };
    }
    if (norm === "documents" || norm === "records" || norm === "forms") {
      return { tab: "more", section: "documents" };
    }
    if (norm === "billing") {
      return { tab: "more", section: "billing" };
    }
    if (norm === "profile") {
      return { tab: "more", section: "profile" };
    }
    if (norm === "more") {
      const sub = searchParams.get("section") as MoreSection | null;
      return { tab: "more", section: sub || "documents" };
    }
    return { tab: "today", section: "documents" };
  };

  const parsedInitial = determineTabs(pathSub || queryTab);
  const [activeTab, setActiveTab] = useState<MainTabType>(parsedInitial.tab);
  const [moreSection, setMoreSection] = useState<MoreSection>(parsedInitial.section);
  const [isMoreExpanded, setIsMoreExpanded] = useState<boolean>(parsedInitial.tab === "more");

  // Synchronize state if URL path or param changes externally
  useEffect(() => {
    const updated = determineTabs(pathSub || queryTab);
    setActiveTab(updated.tab);
    setMoreSection(updated.section);
    if (updated.tab === "more") {
      setIsMoreExpanded(true);
    }
  }, [location.pathname, searchParams]);

  // Demo patient state (defaulting to Ramesh Iyer, 62)
  const initialClientId = searchParams.get("clientId") || "CL-001";
  const [clientId, setClientId] = useState<string>(initialClientId);
  const [client, setClient] = useState<any>(() => {
    const matched = findClientById(initialClientId);
    if (matched && matched.name !== "Sarah Johnson") return matched;
    return {
      id: initialClientId,
      name: "Ramesh Iyer",
      email: "ramesh.iyer@email.com",
      phone: "+91 98765 43210",
      age: 62,
    };
  });

  const [isHeaderQRModalOpen, setIsHeaderQRModalOpen] = useState(false);

  useEffect(() => {
    const matched = findClientById(clientId);
    if (matched && matched.name !== "Sarah Johnson") {
      setClient(matched);
    } else {
      setClient({
        id: clientId,
        name: "Ramesh Iyer",
        email: "ramesh.iyer@email.com",
        phone: "+91 98765 43210",
        age: 62,
      });
    }
  }, [clientId]);

  const handleNavigateTab = (tab: MainTabType, section?: MoreSection) => {
    setActiveTab(tab);
    if (tab === "more") {
      setIsMoreExpanded(true);
      if (section) setMoreSection(section);
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    if (section && tab === "more") {
      nextParams.set("section", section);
    } else {
      nextParams.delete("section");
    }
    navigate(`/patient-front/${tab}?${nextParams.toString()}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMoreSectionChange = (section: MoreSection) => {
    setMoreSection(section);
    setActiveTab("more");
    setIsMoreExpanded(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "more");
    nextParams.set("section", section);
    navigate(`/patient-front/more?${nextParams.toString()}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectClient = (newId: string) => {
    setClientId(newId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("clientId", newId);
    navigate(`/patient-front/${activeTab}?${nextParams.toString()}`, { replace: true });
  };

  const clientName = client?.name || "Ramesh Iyer";
  const initials = clientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-[#14181d] text-[#45515e] dark:text-[#c7d0d9] font-sans antialiased selection:bg-[#1456f0] selection:text-white">
      {/* =========================================================================
          SIDEBAR — quiet, official MantraAssist branding (Width 232px)
          3 Destinations: Today, Visits, More (expands inline)
          ========================================================================= */}
      <aside
        className="hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-30"
        style={{
          width: "232px",
          backgroundColor: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(24, 30, 37, 0.07)",
          padding: "20px 14px",
          gap: "4px",
        }}
      >
        {/* MantraAssist Brand Header */}
        <div
          className="flex items-center gap-2.5"
          style={{ padding: "6px 8px 18px 8px" }}
        >
          <img
            src={logo}
            alt="MantraAssist"
            style={{
              height: "28px",
              width: "auto",
              maxWidth: "145px",
              objectFit: "contain",
            }}
          />
        </div>

        <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
          Patient Companion
        </div>

        {/* 3 Main Destinations */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {/* Destination 1: Today */}
          <button
            type="button"
            onClick={() => handleNavigateTab("today")}
            className={`flex items-center gap-2.5 transition-all text-left cursor-pointer ${
              activeTab === "today"
                ? "font-semibold"
                : "hover:bg-[rgba(24,30,37,0.05)] dark:hover:bg-slate-800/60"
            }`}
            style={{
              padding: "9px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              backgroundColor: activeTab === "today" ? "#eff6ff" : "transparent",
              color: activeTab === "today" ? "#1456f0" : "#45515e",
            }}
          >
            <Clock
              style={{
                width: "16px",
                height: "16px",
                flexShrink: 0,
                color: activeTab === "today" ? "#1456f0" : "currentColor",
              }}
            />
            <span className="flex-1">Today</span>
            {activeTab === "today" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
            )}
          </button>

          {/* Destination 2: Visits */}
          <button
            type="button"
            onClick={() => handleNavigateTab("visits")}
            className={`flex items-center gap-2.5 transition-all text-left cursor-pointer ${
              activeTab === "visits"
                ? "font-semibold"
                : "hover:bg-[rgba(24,30,37,0.05)] dark:hover:bg-slate-800/60"
            }`}
            style={{
              padding: "9px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              backgroundColor: activeTab === "visits" ? "#eff6ff" : "transparent",
              color: activeTab === "visits" ? "#1456f0" : "#45515e",
            }}
          >
            <Calendar
              style={{
                width: "16px",
                height: "16px",
                flexShrink: 0,
                color: activeTab === "visits" ? "#1456f0" : "currentColor",
              }}
            />
            <span className="flex-1">Visits</span>
          </button>

          {/* Destination 3: More (Parent) */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "more") {
                  setIsMoreExpanded(!isMoreExpanded);
                } else {
                  handleNavigateTab("more", moreSection);
                  setIsMoreExpanded(true);
                }
              }}
              className={`flex items-center justify-between gap-2.5 transition-all text-left cursor-pointer ${
                activeTab === "more"
                  ? "font-semibold"
                  : "hover:bg-[rgba(24,30,37,0.05)] dark:hover:bg-slate-800/60"
              }`}
              style={{
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                backgroundColor: activeTab === "more" ? "#eff6ff" : "transparent",
                color: activeTab === "more" ? "#1456f0" : "#45515e",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Layers
                  style={{
                    width: "16px",
                    height: "16px",
                    flexShrink: 0,
                    color: activeTab === "more" ? "#1456f0" : "currentColor",
                  }}
                />
                <span>More</span>
              </div>
              <div className="text-[#94a3b8]">
                {isMoreExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {/* Inline Sub-items when expanded */}
            {isMoreExpanded && (
              <div className="pl-6 pr-1 pt-1 pb-1 flex flex-col gap-0.5 animate-in fade-in duration-150">
                {/* Sub 1: Documents */}
                <button
                  type="button"
                  onClick={() => handleMoreSectionChange("documents")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    activeTab === "more" && moreSection === "documents"
                      ? "text-[#1456f0] font-semibold bg-blue-50/60 dark:bg-blue-950/40"
                      : "text-[#64748b] hover:text-[#222222] hover:bg-slate-100/50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Documents</span>
                </button>

                {/* Sub 2: Billing */}
                <button
                  type="button"
                  onClick={() => handleMoreSectionChange("billing")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    activeTab === "more" && moreSection === "billing"
                      ? "text-[#1456f0] font-semibold bg-blue-50/60 dark:bg-blue-950/40"
                      : "text-[#64748b] hover:text-[#222222] hover:bg-slate-100/50"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Billing</span>
                </button>

                {/* Sub 3: Profile */}
                <button
                  type="button"
                  onClick={() => handleMoreSectionChange("profile")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    activeTab === "more" && moreSection === "profile"
                      ? "text-[#1456f0] font-semibold bg-blue-50/60 dark:bg-blue-950/40"
                      : "text-[#64748b] hover:text-[#222222] hover:bg-slate-100/50"
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Profile</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Quick Check-in trigger */}
        <div className="pt-2 border-t border-[rgba(24,30,37,0.07)]">
          <button
            type="button"
            onClick={() => setIsHeaderQRModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#eff6ff] hover:bg-blue-100/80 text-[#1456f0] text-xs font-semibold cursor-pointer transition-all active:scale-98"
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Fast Check-In</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN VIEWPORT & MOBILE TOPBAR
          ========================================================================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Topbar */}
        <div
          className="md:hidden flex items-center justify-between sticky top-0 z-20"
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(24, 30, 37, 0.07)",
          }}
        >
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="MantraAssist"
              style={{
                height: "24px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigateTab("more", "profile")}
              className={`rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 cursor-pointer ${
                activeTab === "more" && moreSection === "profile"
                  ? "ring-2 ring-[#1456f0]"
                  : ""
              }`}
              style={{
                width: "30px",
                height: "30px",
                backgroundColor: "#181e25",
              }}
            >
              {initials}
            </button>
          </div>
        </div>

        {/* Content Container (760px max width matching design token) */}
        <main
          className="w-full mx-auto"
          style={{
            maxWidth: "760px",
            padding: "32px 24px 96px 24px",
          }}
        >
          {activeTab === "today" && (
            <PatientFrontHome
              clientId={clientId}
              onNavigateTab={(destination) => {
                if (destination === "appointments") {
                  handleNavigateTab("visits");
                } else if (
                  destination === "documents" ||
                  destination === "billing" ||
                  destination === "profile"
                ) {
                  handleNavigateTab("more", destination);
                } else {
                  handleNavigateTab("today");
                }
              }}
              onTriggerCheckin={() => setIsHeaderQRModalOpen(true)}
            />
          )}

          {activeTab === "visits" && (
            <PatientAppointments
              clientId={clientId}
              clientName={clientName}
              clientEmail={client?.email || "ramesh.iyer@email.com"}
              clientPhone={client?.phone || "+91 98765 43210"}
            />
          )}

          {activeTab === "more" && (
            <PatientMore
              clientId={clientId}
              clientName={clientName}
              initialSection={moreSection}
              onSectionChange={(sec) => setMoreSection(sec)}
              onSelectClient={handleSelectClient}
            />
          )}
        </main>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (3 Destinations: Today · Visits · More)
          ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(24, 30, 37, 0.08)",
          padding: "6px 8px calc(6px + env(safe-area-inset-bottom, 0px)) 8px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.04)",
        }}
      >
        {/* Item 1: Today */}
        <button
          type="button"
          onClick={() => handleNavigateTab("today")}
          className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors"
          style={{
            height: "46px",
            gap: "2px",
            color: activeTab === "today" ? "#1456f0" : "#64748b",
          }}
        >
          <Clock style={{ width: "18px", height: "18px" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: activeTab === "today" ? 600 : 500,
            }}
          >
            Today
          </span>
        </button>

        {/* Item 2: Visits */}
        <button
          type="button"
          onClick={() => handleNavigateTab("visits")}
          className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors"
          style={{
            height: "46px",
            gap: "2px",
            color: activeTab === "visits" ? "#1456f0" : "#64748b",
          }}
        >
          <Calendar style={{ width: "18px", height: "18px" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: activeTab === "visits" ? 600 : 500,
            }}
          >
            Visits
          </span>
        </button>

        {/* Item 3: More */}
        <button
          type="button"
          onClick={() => handleNavigateTab("more")}
          className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors"
          style={{
            height: "46px",
            gap: "2px",
            color: activeTab === "more" ? "#1456f0" : "#64748b",
          }}
        >
          <Layers style={{ width: "18px", height: "18px" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: activeTab === "more" ? 600 : 500,
            }}
          >
            More
          </span>
        </button>
      </nav>

      {/* Instant Fast Check-in Modal */}
      <QRCheckinModal
        isOpen={isHeaderQRModalOpen}
        onClose={() => setIsHeaderQRModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        onCheckinSuccess={() => {
          handleNavigateTab("today");
        }}
      />
    </div>
  );
}
