/**
 * AdminLayout.tsx
 * Path: src/app/components/layout/AdminLayout.tsx
 *
 * Dedicated Admin Portal Layout:
 * - Full-width layout with fixed compact top header (h-12).
 * - Hamburger button in top bar toggles the side drawer below the topbar.
 * - Side drawer slides in from the left underneath the header, keeping the top bar visible.
 * - Main content area enjoys 100% full viewport width.
 */

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import AdminSidebar from "./AdminSidebar";
import logo from "../../../imports/ma_logo.png";
import { Menu, X } from "lucide-react";

export default function AdminLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on page route navigation
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222]">
      {/* ── Fixed Full-Width Compact Top Header (Stays on top) ── */}
      <header className="h-12 bg-white border-b border-gray-200/90 flex items-center shrink-0 z-40 select-none relative">
        {/* Left Area: Hamburger Menu Trigger + Brand Logo */}
        <div className="h-full px-4 sm:px-5 flex items-center gap-3 shrink-0 border-r border-gray-200/90">
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`p-1.5 -ml-1 rounded-xl transition-colors cursor-pointer flex items-center justify-center group ${
              isDrawerOpen
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            aria-label={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isDrawerOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700 group-hover:scale-105 transition-transform" />
            )}
          </button>

          <Link to="/admin/workflows" className="flex items-center shrink-0">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-6 w-auto max-w-[140px] object-contain"
            />
          </Link>
        </div>

        {/* Top Bar Page Header Slot */}
        <div className="flex-1 h-full px-6 sm:px-10 flex items-center justify-between gap-3 min-w-0">
          <div id="topbar-page-header" className="flex-1 flex items-center justify-between gap-3 min-w-0" />
        </div>
      </header>

      {/* ── Main Content Area + Below-Topbar Slide Drawer ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Slide-Out Side Drawer (Positioned below the h-12 topbar) */}
        {isDrawerOpen && (
          <div className="fixed top-12 inset-x-0 bottom-0 z-35 flex">
            {/* Backdrop overlay below topbar */}
            <div
              className="fixed top-12 inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Slide Drawer Panel (Anchored to top-12, exactly below the header) */}
            <div className="fixed top-12 bottom-0 left-0 z-35 w-64 min-w-[256px] max-w-[256px] bg-white shadow-2xl border-r border-gray-200/90 flex flex-col select-none animate-in slide-in-from-left duration-250 ease-out">
              <AdminSidebar onClose={() => setIsDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area (100% full width) */}
        <main className="w-full flex-1 overflow-y-auto relative min-w-0 bg-[#fafafa]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
