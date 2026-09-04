import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import AIScribeFloatingWidget from "../scribe/AIScribeFloatingWidget";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-[#fafafa] font-sans antialiased text-[#222222] relative">
      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative min-w-0">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-5 left-5 z-40 p-2.5 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-sm hover:bg-white text-[#222222] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 text-[#222222]" />
        </button>

        <div className="min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Persistent AI Scribe Floating Widget */}
      <AIScribeFloatingWidget />
    </div>
  );
}
