import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  CheckSquare,
  MessageCircle,
  Receipt,
  Settings,
  Check,
  Trash2,
  X,
  Calendar,
  PhoneCall,
  Users,
  LayoutDashboard,
  FileText,
  GitBranch,
  BookOpen,
  Workflow,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { useNotifications, addNotification } from "../../../lib/notificationsStore";
import { useNotificationSettings, ROLE_NOTIFICATION_MODULES } from "../../../lib/notificationSettingsStore";
import { Tooltip } from "../ui/Tooltip";
import { InAppNotification, NotificationType } from "../../../types/notification";
import { toast } from "sonner";

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { settings, modules, toggleModule, setAllModules } = useNotificationSettings();

  const [filter, setFilter] = useState<"all" | "unread" | "task" | "chat">("all");
  const [isSettingsView, setIsSettingsView] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "task") return n.type === "task";
    if (filter === "chat") return n.type === "chat";
    return true;
  });

  const enabledCount = modules.filter((m) => settings[m.id]).length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      case "chat":
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case "billing":
        return <Receipt className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getModuleIcon = (id: string) => {
    switch (id) {
      case "appointments":
        return <Calendar className="w-4 h-4 text-sky-600" />;
      case "billings":
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      case "calls":
        return <PhoneCall className="w-4 h-4 text-violet-600" />;
      case "chats":
        return <MessageCircle className="w-4 h-4 text-teal-600" />;
      case "clients":
        return <Users className="w-4 h-4 text-indigo-600" />;
      case "dashboard":
        return <LayoutDashboard className="w-4 h-4 text-blue-600" />;
      case "documentTemplates":
        return <FileText className="w-4 h-4 text-amber-600" />;
      case "integrations":
        return <GitBranch className="w-4 h-4 text-rose-600" />;
      case "knowledgeBase":
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case "processes":
        return <Workflow className="w-4 h-4 text-cyan-600" />;
      case "tasks":
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      default:
        return <Settings className="w-4 h-4 text-slate-600" />;
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
      onClose={() => {
        setIsSettingsView(false);
        onClose();
      }}
      title={isSettingsView ? "Notification Settings" : "Notifications"}
      subtitle={
        isSettingsView
          ? "Configure allowed notifications by module"
          : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
      }
      icon={
        isSettingsView ? (
          <Settings className="w-5 h-5 text-slate-700" />
        ) : (
          <Bell className="w-5 h-5 text-slate-700" />
        )
      }
      width="max-w-[480px]"
      zIndex={1000}
      headerRight={
        <div className="flex items-center gap-1.5">
          {/* Toggle between updates list and module settings */}
          <Tooltip content={isSettingsView ? "Back to updates" : "Notification Settings"}>
            <button
              type="button"
              onClick={() => setIsSettingsView((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isSettingsView
                  ? "bg-blue-50 text-[#1456f0] border border-blue-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-gray-200/80"
              }`}
              aria-label={isSettingsView ? "Back to notifications" : "Notification settings"}
            >
              {isSettingsView ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Updates</span>
                </>
              ) : (
                <>
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </>
              )}
            </button>
          </Tooltip>

          {!isSettingsView && (
            <>
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
            </>
          )}
        </div>
      }
      tabs={
        isSettingsView ? (
          <div className="flex items-center justify-between w-full py-0.5">
            <span className="text-xs font-semibold text-slate-600">
              {enabledCount} of {modules.length} modules active
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAllModules(true);
                  toast.success("All module notifications enabled");
                }}
                className="font-semibold text-[#1456f0] hover:underline cursor-pointer"
              >
                Enable All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setAllModules(false);
                  toast.info("All module notifications disabled");
                }}
                className="font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Disable All
              </button>
            </div>
          </div>
        ) : (
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
        )
      }
      bodyClassName="p-0 overflow-y-auto divide-y divide-gray-100"
    >
      {isSettingsView ? (
        /* ── Module Notification Permissions Settings View ── */
        <div className="divide-y divide-gray-100">
          <div className="p-3.5 bg-slate-50/70 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-slate-600 font-medium">
              Toggle which roles &amp; permissions modules can send popups and in-app alerts:
            </p>
          </div>

          {modules.map((mod) => {
            const isEnabled = Boolean(settings[mod.id]);
            return (
              <div
                key={mod.id}
                className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                    {getModuleIcon(mod.id)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {mod.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {mod.description}
                    </p>
                  </div>
                </div>

                {/* ON / OFF Toggle Switch Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase transition-colors ${
                      isEnabled ? "text-[#1E293B]" : "text-slate-400"
                    }`}
                  >
                    {isEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => {
                      toggleModule(mod.id);
                      toast.success(
                        `${mod.label} notifications turned ${!isEnabled ? "ON" : "OFF"}`
                      );
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? "bg-[#1E293B]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Test Notification Trigger Banner */}
          <div className="p-4 bg-slate-50/90 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Test Notification Popup</p>
              <p className="text-[11px] text-slate-500">Triggers the 1-minute slim rectangle corner popup</p>
            </div>
            <button
              type="button"
              onClick={() => {
                addNotification({
                  type: "task",
                  title: "Pre-Op Checklist Assigned",
                  message: "Dr. Alistair Mehta assigned you to review fasting verification docs.",
                  link: "/tasks",
                  module: "tasks",
                });
                toast.success("Notification sent! Look at the top-right corner.");
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Send Test</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Standard Notifications List View ── */
        filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No notifications to display.
          </div>
        ) : (
          filtered.map((item) => {
            const isPatientPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/patient");
            const displayTitle = isPatientPortal ? item.title.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim() : item.title;
            const displayMessage = isPatientPortal ? item.message.replace(/\bTSK-\d+\b[:\s-]*/gi, "").trim() : item.message;

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  item.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/30 hover:bg-blue-50/60"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {displayTitle}
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
                    {displayMessage}
                  </p>
                </div>
              </div>
            );
          })
        )
      )}
    </DrawerShell>
  );
}
