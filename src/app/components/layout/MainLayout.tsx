import React, { useState, useEffect, useMemo } from "react";
import { Outlet, Link } from "react-router";
import Sidebar from "./Sidebar";
import AIAssistantCapsule from "../ai/AIAssistantCapsule";
import logo from "../../../imports/ma_logo.png";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { useSidebar } from "../../context/SidebarContext";
import { useSidebarMenu } from "../../context/SidebarMenuContext";
import TopBarNotificationBell from "./TopBarNotificationBell";
import TeamMemberDrawer, { OPEN_USER_PROFILE_DRAWER_EVENT } from "../TeamMemberDrawer";
import { useAuth } from "../../context/AuthContext";
import { getStoredTeamMembers } from "../../../lib/teamStore";

export default function MainLayout() {
  const { collapsed, setCollapsed } = useSidebar();
  const { isConfiguring } = useSidebarMenu();
  const isCollapsed = collapsed && !isConfiguring;
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsProfileOpen(true);
    window.addEventListener(OPEN_USER_PROFILE_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_USER_PROFILE_DRAWER_EVENT, handleOpen);
  }, []);

  const profileMember = useMemo(() => {
    const members = getStoredTeamMembers();
    const found = members.find(
      (m) =>
        (user?.email && m.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.name && m.name?.toLowerCase() === user.name.toLowerCase())
    );
    if (found) return found;
    return {
      id: "current-user",
      name: user?.name || "Admin User",
      email: user?.email || "admin@mantra.care",
      role: user?.role || "SystemAdmin",
      department: "Administration",
      phone: "+1 (555) 019-2834",
      status: true,
      canBookAppointments: true,
    };
  }, [user]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 flex items-center shrink-0 z-40 select-none">
        {/* Left Brand / Nav Toggle Area (Aligned with Sidebar) */}
        <div
          className={`h-full flex items-center shrink-0 transition-[width] duration-300 ease-in-out border-r border-gray-200/90 ${
            isCollapsed
              ? "w-[68px] min-w-[68px] max-w-[68px] justify-center px-2"
              : "w-64 min-w-[256px] max-w-[256px] justify-between px-4"
          }`}
        >
          {isCollapsed ? (
            /* Collapsed State: Ma-symbol-mark.png (Clickable to expand sidebar) */
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1 rounded-xl hover:bg-gray-100 transition-all cursor-pointer flex items-center justify-center group"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <img
                src={symbolLogo}
                alt="MantraAssist"
                className="h-7 w-7 object-contain transition-transform group-hover:scale-105"
              />
            </button>
          ) : (
            /* Expanded State: Full ma_logo.png cleanly positioned */
            <Link to="/" className="flex items-center shrink-0">
              <img
                src={logo}
                alt="MantraAssist"
                className="h-6 w-auto max-w-[140px] object-contain"
              />
            </Link>
          )}
        </div>

        {/* Top Bar Page Header Slot */}
        <div className="flex-1 h-full px-10 sm:px-12 flex items-center justify-between gap-3 min-w-0">
          <div id="topbar-page-header" className="flex-1 flex items-center justify-between gap-3 min-w-0" />
          <TopBarNotificationBell />
        </div>
      </header>

      {/* ── Docked Collapsible / Expandable Sidebar + Main Content Layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative min-w-0 bg-[#fafafa]">
          <Outlet />
          <AIAssistantCapsule />
        </main>
      </div>

      {/* Shared User Profile Drawer */}
      <TeamMemberDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        member={profileMember}
      />
    </div>
  );
}

