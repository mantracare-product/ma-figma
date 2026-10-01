import React from "react";
import { Outlet, Link } from "react-router";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import logo from "../../../imports/ma_logo.png";
import AIScribeFloatingWidget from "../scribe/AIScribeFloatingWidget";
import { useSidebar } from "../../context/SidebarContext";

export default function MainLayout() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 flex items-center shrink-0 z-40 select-none">
        {/* Left Brand / Nav Toggle Area (Aligned with Sidebar) */}
        <div
          className={`h-full flex items-center px-4 shrink-0 transition-[width] duration-300 ease-in-out border-r border-gray-200/90 ${
            collapsed
              ? "w-[68px] min-w-[68px] max-w-[68px] justify-center"
              : "w-64 min-w-[256px] max-w-[256px] justify-between"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Menu Toggle (Expands / Collapses Sidebar) */}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="p-1.5 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              aria-label="Toggle sidebar"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="w-4.5 h-4.5 text-gray-800" />
            </button>

            {/* MantraAssist Brand Logo */}
            {!collapsed && (
              <Link to="/" className="flex items-center shrink-0">
                <img
                  src={logo}
                  alt="MantraAssist"
                  className="h-6 w-auto max-w-[140px] object-contain"
                />
              </Link>
            )}
          </div>
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

