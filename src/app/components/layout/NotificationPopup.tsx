import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { InAppNotification } from "../../../types/notification";
import {
  NEW_NOTIFICATION_POPUP_EVENT,
  OPEN_NOTIFICATIONS_DRAWER_EVENT,
} from "../../../lib/notificationsStore";

const POPUP_DURATION_MS = 60000; // 60 seconds (1 minute)

export default function NotificationPopup() {
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [remainingMs, setRemainingMs] = useState(POPUP_DURATION_MS);
  const [isPaused, setIsPaused] = useState(false);

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const remainingMsRef = useRef(POPUP_DURATION_MS);
  remainingMsRef.current = remainingMs;

  const lastTickRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = () => {
    setActiveNotification(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleOpenDrawer = () => {
    dismiss();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_DRAWER_EVENT));
    }
  };

  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<InAppNotification>;
      if (!customEvent.detail) return;

      const notif = customEvent.detail;
      setActiveNotification(notif);
      setRemainingMs(POPUP_DURATION_MS);
      setIsPaused(false);
      lastTickRef.current = Date.now();

      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        if (isPausedRef.current) {
          lastTickRef.current = Date.now();
          return;
        }

        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        const next = Math.max(0, remainingMsRef.current - delta);
        setRemainingMs(next);

        if (next <= 0) {
          dismiss();
        }
      }, 100);
    };

    window.addEventListener(NEW_NOTIFICATION_POPUP_EVENT, handleNewNotification);
    return () => {
      window.removeEventListener(NEW_NOTIFICATION_POPUP_EVENT, handleNewNotification);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!activeNotification || typeof document === "undefined") return null;

  // Format title and message, cleaning any prefix in patient view if applicable
  const isPatientPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/patient");
  const displayTitle = isPatientPortal
    ? activeNotification.title.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
    : activeNotification.title;
  const displayMessage = isPatientPortal
    ? activeNotification.message.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
    : activeNotification.message;

  const progressPercent = (remainingMs / POPUP_DURATION_MS) * 100;

  const content = (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleOpenDrawer}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-4 right-4 z-[99999] w-[356px] max-w-[calc(100vw-32px)] bg-white border border-gray-200/90 rounded-xl shadow-lg shadow-black/5 overflow-hidden cursor-pointer hover:border-slate-300 transition-all select-none animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="p-3.5 flex items-start gap-3">
        {/* Check-circle icon at the left in existing emerald tone */}
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />

        {/* Center Content */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Top Line: Bold Title + Mono Timestamp + Close Button */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0 -mt-0.5">
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                Just now
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Message Line: Truncated to one line with ellipsis and tooltip */}
          <Tooltip content={displayMessage}>
            <p className="text-xs text-slate-600 truncate block mt-0.5 cursor-default">
              {displayMessage}
            </p>
          </Tooltip>

          {/* Click to open notifications link */}
          <div className="mt-2.5">
            <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <span>Click to open notifications</span>
              <span className="font-normal">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Auto-dismiss progress bar along the bottom edge in neutral slate tone */}
      <div className="w-full bg-slate-100 h-1 overflow-hidden">
        <div
          className="bg-slate-400 h-full transition-all duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
