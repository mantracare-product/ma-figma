/**
 * AdminLayout.tsx
 * Path: src/app/components/layout/AdminLayout.tsx
 *
 * Dedicated Admin Portal Layout matching the reference UI:
 * - Topbar is fixed full-width at the top (h-12); logo & hamburger remain stationary.
 * - AdminSidebar lives strictly below the topbar (top-12) and smoothly toggles open/close.
 * - Main content area fluidly expands when sidebar is collapsed.
 */

import React, { useState } from "react";
import { Outlet, Link } from "react-router";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";
import logo from "../../../imports/ma_logo.png";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8FAFC] font-sans antialiased text-[#111827]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 px-4 flex items-center justify-between shrink-0 z-40 select-none">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle admin sidebar"
          >
            <Menu className="w-4.5 h-4.5 text-gray-800" />
          </button>

          {/* MantraAssist Brand Logo */}
          <Link to="/admin/custom-fields" className="flex items-center shrink-0">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-6 w-auto max-w-[140px] object-contain"
            />
          </Link>

          {/* Vertical divider */}
          <div className="h-4 w-px bg-gray-200 shrink-0 hidden sm:block" />

          {/* Top Bar Page Header Slot */}
          <div id="topbar-page-header" className="flex-1 flex items-center justify-between gap-3 min-w-0" />
        </div>
      </header>

      {/* ── Drawer Sidebar (fixed overlay — never shifts page content) ── */}
      {/* Backdrop — clicking it closes the drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] top-12"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel itself */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Scrollable Main Administrative Content View — always full-width */}
      <main className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
