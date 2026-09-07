"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

export interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col antialiased">
      {/* Top Header Navbar with Hamburger & Logo */}
      <header className="sticky top-0 z-50 h-14 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl text-slate-700 hover:text-[#181e25] hover:bg-slate-100/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/analytics" className="flex items-center">
            <Image
              src="/ma_logo.png"
              alt="MantraAssist"
              width={160}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Slide-out Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                onMenuToggle: () => setIsSidebarOpen(!isSidebarOpen),
              })
            : children}
        </main>
      </div>
    </div>
  );
};
