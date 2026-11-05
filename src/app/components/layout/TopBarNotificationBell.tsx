import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications, OPEN_NOTIFICATIONS_DRAWER_EVENT } from "../../../lib/notificationsStore";
import { Tooltip } from "../ui/Tooltip";
import NotificationDrawer from "./NotificationDrawer";
import NotificationPopup from "./NotificationPopup";

export default function TopBarNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  // Listen to programmatic open requests (e.g. clicking the popup banner)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handleOpen);
  }, []);

  return (
    <>
      <Tooltip content={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications"}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Open notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#1456f0] text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* Global 60-second slim rectangle popup */}
      <NotificationPopup />
    </>
  );
}
