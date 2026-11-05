import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Bell,
  CheckSquare,
  MessageCircle,
  Receipt,
  PhoneCall,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { InAppNotification, NotificationType } from "../../../types/notification";
import {
  NEW_NOTIFICATION_POPUP_EVENT,
  OPEN_NOTIFICATIONS_DRAWER_EVENT,
} from "../../../lib/notificationsStore";

const POPUP_DURATION_MS = 60000; // 1 minute (60 seconds)

export default function NotificationPopup() {
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const dismiss = () => {
    setActiveNotification(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
      setProgress(100);
      startTimeRef.current = Date.now();

      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // Auto dismiss after 1 minute (60s)
      timerRef.current = setTimeout(() => {
        dismiss();
      }, POPUP_DURATION_MS);

      // Smooth progress bar update every 100ms
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / POPUP_DURATION_MS) * 100);
        setProgress(remaining);
        if (remaining <= 0 && progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }, 100);
    };

    window.addEventListener(NEW_NOTIFICATION_POPUP_EVENT, handleNewNotification);
    return () => {
      window.removeEventListener(NEW_NOTIFICATION_POPUP_EVENT, handleNewNotification);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  if (!activeNotification || typeof document === "undefined") return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-3.5 h-3.5 text-blue-600" />;
      case "chat":
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case "billing":
        return <Receipt className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  // Strip task id prefix in patient portal if needed
  const isPatientPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/patient");
  const displayTitle = isPatientPortal
    ? activeNotification.title.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
    : activeNotification.title;
  const displayMessage = isPatientPortal
    ? activeNotification.message.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim()
    : activeNotification.message;

  const content = (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleOpenDrawer}
      className="fixed top-4 right-4 z-[99999] w-[360px] max-w-[calc(100vw-32px)] bg-white border border-gray-200/90 rounded-xl shadow-2xl shadow-slate-900/15 overflow-hidden cursor-pointer hover:border-blue-400/80 transition-all group animate-in slide-in-from-right duration-250 select-none"
    >
      <div className="p-3 flex items-start gap-3">
        {/* Module Icon Badge */}
        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          {getIcon(activeNotification.type)}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {displayTitle}
            </h4>
            <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
              Just now
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate leading-snug">
            {displayMessage}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#1456f0] group-hover:underline">
            <span>Click to open notifications</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Dismiss Button (X) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Dismiss popup"
          aria-label="Dismiss popup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slim 1-minute progress countdown bar */}
      <div className="w-full bg-slate-100 h-1 overflow-hidden">
        <div
          className="bg-[#1456f0] h-full transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

