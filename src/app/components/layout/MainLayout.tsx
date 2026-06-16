import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import ThemeSwitcher from "../ThemeSwitcher";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto bg-background relative">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-6 left-6 z-40 p-2 bg-card border border-border rounded-xl shadow-sm hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <Outlet />
      </main>
      <ThemeSwitcher />
    </div>
  );
}
