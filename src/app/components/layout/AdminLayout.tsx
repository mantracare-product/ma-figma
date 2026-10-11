/**
 * AdminLayout.tsx
 * Path: src/app/components/layout/AdminLayout.tsx
 *
 * Dedicated Admin Portal Layout matching the client layout:
 * - Topbar is fixed full-width at the top (h-12), left brand area aligned with sidebar width.
 * - AdminSidebar is docked inline (collapsible to 68px or expanded to 256px).
 * - Main content area fluidly expands and shares identical corner spacing and topbar alignment.
 */

import React from "react";
import { Outlet, Link } from "react-router";
import AdminSidebar from "./AdminSidebar";
import logo from "../../../imports/ma_logo.png";
import symbolLogo from "../../../imports/Ma-symbol-mark.png";
import { useSidebar } from "../../context/SidebarContext";

export default function AdminLayout() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 flex items-center shrink-0 z-40 select-none">
        {/* Left Brand / Nav Toggle Area (Aligned with Sidebar) */}
        <div
          className={`h-full flex items-center shrink-0 transition-[width] duration-300 ease-in-out border-r border-gray-200/90 ${
            collapsed
              ? "w-[68px] min-w-[68px] max-w-[68px] justify-center px-2"
              : "w-64 min-w-[256px] max-w-[256px] justify-between px-4"
          }`}
        >
          {collapsed ? (
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
            <Link to="/admin/workflows" className="flex items-center shrink-0">
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
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto relative min-w-0 bg-[#fafafa]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
