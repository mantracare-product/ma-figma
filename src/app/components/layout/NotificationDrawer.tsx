import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckSquare, MessageCircle, Receipt, Info, Check, Trash2, X } from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { useNotifications } from "../../../lib/notificationsStore";
import { Tooltip } from "../ui/Tooltip";
import { InAppNotification, NotificationType } from "../../../types/notification";

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "task" | "chat">("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "task") return n.type === "task";
    if (filter === "chat") return n.type === "chat";
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-slate-600" />;
      case "chat":
        return <MessageCircle className="w-4 h-4 text-slate-600" />;
      case "billing":
        return <Receipt className="w-4 h-4 text-slate-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleNotificationClick = (item: InAppNotification) => {
    markAsRead(item.id);
    if (item.link) {
      onClose();
      if (window.location.pathname.startsWith("/patient")) {
        if (item.link.startsWith("/tasks")) {
          navigate("/patient/tasks");
          return;
        }
        if (item.link.startsWith("/chats")) {
          navigate("/patient/messages");
          return;
        }
      }
      navigate(item.link);
    }
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle={`${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`}
      icon={<Bell className="w-5 h-5 text-slate-700" />}
      width="max-w-[480px]"
      zIndex={700}
      headerRight={
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Tooltip content="Mark all updates as read">
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium px-2 py-1"
              >
                <Check className="w-3.5 h-3.5 text-slate-400" />
                <span>Mark all read</span>
              </button>
            </Tooltip>
          )}
          {notifications.length > 0 && (
            <Tooltip content="Clear notification history">
              <button
                type="button"
                onClick={clearAll}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      }
      tabs={
        <div className="flex items-center gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "task", label: "Tasks" },
              { id: "chat", label: "Chats" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filter === tab.id
                  ? "bg-[#1E293B] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
      bodyClassName="p-0 overflow-y-auto divide-y divide-gray-100"
    >
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs italic">
          No notifications to display.
        </div>
      ) : (
        filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => handleNotificationClick(item)}
            className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
              item.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/30 hover:bg-blue-50/60"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {item.title}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    {item.timestamp}
                  </span>
                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {item.message}
              </p>
            </div>
          </div>
        ))
      )}
    </DrawerShell>
  );
}

