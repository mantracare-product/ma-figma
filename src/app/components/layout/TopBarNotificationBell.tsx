import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNotifications, OPEN_NOTIFICATIONS_DRAWER_EVENT } from "../../../lib/notificationsStore";
import { Tooltip } from "../ui/Tooltip";
import NotificationDrawer from "./NotificationDrawer";
import NotificationPopup from "./NotificationPopup";

export default function TopBarNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Listen to programmatic open requests (e.g. clicking the popup banner)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handleOpen);
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <Tooltip content={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications"}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative w-9 h-9 rounded-[8px] transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
            isOpen ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-label="Open notifications"
        >
          <Bell className="w-[22px] h-[22px]" strokeWidth={1.85} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1E293B] text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center ring-2 ring-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
      />

      {/* Global 60-second slim rectangle popup */}
      <NotificationPopup />
    </div>
  );
}
