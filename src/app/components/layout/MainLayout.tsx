import React from "react";
import { Outlet, Link } from "react-router";
import Sidebar from "./Sidebar";
import logo from "../../../imports/ma_logo.png";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import AIScribeFloatingWidget from "../scribe/AIScribeFloatingWidget";
import { useSidebar } from "../../context/SidebarContext";
import { useSidebarMenu } from "../../context/SidebarMenuContext";

export default function MainLayout() {
  const { collapsed, setCollapsed } = useSidebar();
  const { isConfiguring } = useSidebarMenu();
  const isCollapsed = collapsed && !isConfiguring;

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
        </div>
      </header>

      {/* ── Docked Collapsible / Expandable Sidebar + Main Content Layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative min-w-0 bg-[#fafafa]">
          <Outlet />
        </main>
      </div>

      {/* Persistent AI Scribe Floating Widget */}
      <AIScribeFloatingWidget />
    </div>
  );
}

