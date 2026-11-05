import { useState, useEffect, useCallback } from "react";
import { InAppNotification } from "../types/notification";
import { isModuleNotificationAllowed } from "./notificationSettingsStore";

export const NOTIFICATIONS_STORAGE_KEY = "mantra_notifications_store";
export const NOTIFICATIONS_STORE_EVENT = "mantra-notifications-updated";
export const NEW_NOTIFICATION_POPUP_EVENT = "mantra-new-notification-popup";
export const OPEN_NOTIFICATIONS_DRAWER_EVENT = "mantra-open-notifications-drawer";

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: "notif-1",
    type: "task",
    title: "New Task Assigned",
    message: "You have been assigned to 'Verify Patient Insurance Eligibility for Fasting Labs'.",
    timestamp: "10 minutes ago",
    read: false,
    link: "/tasks?id=tsk-001",
    module: "tasks",
    meta: { taskId: "tsk-001", module: "tasks" },
  },
  {
    id: "notif-2",
    type: "chat",
    title: "New Message in Clinical Staff Group",
    message: "Dr. Alistair Mehta: 'Please update morning lab charts before rounds.'",
    timestamp: "45 minutes ago",
    read: false,
    link: "/chats",
    module: "chats",
    meta: { conversationId: "grp-clinical-care", senderName: "Dr. Alistair Mehta", module: "chats" },
  },
  {
    id: "notif-3",
    type: "task",
    title: "Task Review Requested",
    message: "Sarah Johnson completed intake forms for review: 'Complete Intake Medical History'.",
    timestamp: "2 hours ago",
    read: false,
    link: "/tasks?id=tsk-004",
    module: "tasks",
    meta: { taskId: "tsk-004", module: "tasks" },
  },
  {
    id: "notif-4",
    type: "system",
    title: "Monthly Billing Reconciled",
    message: "Task 'Automated Monthly Billing Reconciliation' marked completed.",
    timestamp: "Yesterday",
    read: true,
    link: "/tasks?id=tsk-005",
    module: "billings",
    meta: { taskId: "tsk-005", module: "billings" },
  },
];

export function getStoredNotifications(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(list: InAppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_STORE_EVENT, { detail: list }));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to persist notifications:", err);
  }
}

export function addNotification(notifData: Omit<InAppNotification, "id" | "timestamp" | "read">): InAppNotification {
  const modId = notifData.module || notifData.meta?.module || notifData.type;

  const current = getStoredNotifications();
  const newNotif: InAppNotification = {
    ...notifData,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: "Just now",
    read: false,
    module: modId,
  };

  // Only store and trigger popup if notification module is enabled by user settings
  if (isModuleNotificationAllowed(modId)) {
    const updated = [newNotif, ...current];
    saveStoredNotifications(updated);

    // Emit event for slim top-right corner notification popup (lasts 60s)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NEW_NOTIFICATION_POPUP_EVENT, { detail: newNotif }));
    }
  }

  return newNotif;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => getStoredNotifications());

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStoredNotifications());
    };
    window.addEventListener(NOTIFICATIONS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(NOTIFICATIONS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    const current = getStoredNotifications();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveStoredNotifications(updated);
  }, []);

  const markAllAsRead = useCallback(() => {
    const current = getStoredNotifications();
    const updated = current.map((n) => ({ ...n, read: true }));
    saveStoredNotifications(updated);
  }, []);

  const clearAll = useCallback(() => {
    saveStoredNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
