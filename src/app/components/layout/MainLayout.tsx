import React, { useState } from "react";
import { Outlet, Link } from "react-router";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import logo from "../../../imports/ma_logo.png";
import AIScribeFloatingWidget from "../scribe/AIScribeFloatingWidget";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Compact Top Header ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 px-10 sm:px-12 flex items-center justify-between shrink-0 z-40 select-none">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4.5 h-4.5 text-gray-800" />
          </button>

          {/* MantraAssist Brand Logo */}
          <Link to="/" className="flex items-center shrink-0">
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Scrollable Main Content View */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        <Outlet />
      </main>

      {/* Persistent AI Scribe Floating Widget */}
      <AIScribeFloatingWidget />
    </div>
  );
}
