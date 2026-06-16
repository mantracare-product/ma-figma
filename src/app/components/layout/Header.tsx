import { useState } from "react";
import { Bell, ChevronDown, Menu, Building2, User, Settings, LogOut } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const closeAllDropdowns = () => {
    setShowOrgMenu(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-foreground hover:text-primary transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-primary">MantraAssist</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Organization Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowOrgMenu(!showOrgMenu);
              setShowProfileMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Healthcare Org</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showOrgMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-50">
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors">
                Healthcare Org
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors">
                Demo Organization
              </button>
              <div className="border-t border-border my-2" />
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-primary">
                + Add Organization
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowOrgMenu(false);
              setShowProfileMenu(false);
            }}
            className="relative p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-border">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-muted transition-colors cursor-pointer">
                  <p className="text-sm font-medium">New call completed</p>
                  <p className="text-xs text-muted-foreground mt-1">Patient John Doe - 2 min ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-muted transition-colors cursor-pointer">
                  <p className="text-sm font-medium">Appointment scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">Sarah Johnson - 15 min ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowOrgMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              A
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-2 z-50">
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-border my-2" />
              <button className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-destructive">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
