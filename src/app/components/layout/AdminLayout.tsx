/**
 * AdminLayout.tsx
 * Path: src/app/components/layout/AdminLayout.tsx
 *
 * Dedicated Admin Portal Layout:
 * - Topbar is fixed full-width at the top (h-12), left brand area aligned with fixed sidebar width (w-64).
 * - AdminSidebar is docked as a non-collapsible side drawer panel (w-64) on desktop, with slide drawer on mobile.
 * - Main content area fluidly expands and shares identical corner spacing and topbar alignment.
 */

import React, { useState } from "react";
import { Outlet, Link } from "react-router";
import AdminSidebar from "./AdminSidebar";
import logo from "../../../imports/ma_logo.png";
import { Menu } from "lucide-react";

export default function AdminLayout() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 flex items-center shrink-0 z-40 select-none">
        {/* Left Brand Area (Aligned with Sidebar: w-64) */}
        <div className="h-full w-64 min-w-[256px] max-w-[256px] border-r border-gray-200/90 px-4 flex items-center justify-between shrink-0">
          <Link to="/admin/workflows" className="flex items-center shrink-0">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-6 w-auto max-w-[140px] object-contain"
            />
          </Link>
          {/* Mobile drawer toggle */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation drawer"
            title="Toggle navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Top Bar Page Header Slot */}
        <div className="flex-1 h-full px-10 sm:px-12 flex items-center justify-between gap-3 min-w-0">
          <div id="topbar-page-header" className="flex-1 flex items-center justify-between gap-3 min-w-0" />
        </div>
      </header>

      {/* ── Side Drawer Panel + Main Content Layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Mobile Backdrop */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Side Drawer Panel: Permanently docked on desktop, off-canvas slide on mobile */}
        <div
          className={`h-full z-40 md:z-30 transition-transform duration-200 ease-in-out shrink-0 ${
            isMobileDrawerOpen
              ? "fixed inset-y-0 left-0 translate-x-0 shadow-2xl md:shadow-none md:static"
              : "fixed inset-y-0 left-0 -translate-x-full md:translate-x-0 md:static"
          }`}
        >
          <AdminSidebar onClose={() => setIsMobileDrawerOpen(false)} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative min-w-0 bg-[#fafafa]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
