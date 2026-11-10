import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Calendar,
  Receipt,
  PhoneCall,
  MessageCircle,
  Users,
  LayoutDashboard,
  FileText,
  GitBranch,
  BookOpen,
  Workflow,
  CheckSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationSettings,
  ROLE_NOTIFICATION_MODULES,
} from "../../../lib/notificationSettingsStore";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  BrowserNotificationStatus,
} from "../../../lib/browserPushNotifications";

export default function NotificationsSettingsTab() {
  const { settings, modules, toggleModule, setAllModules } = useNotificationSettings();
  const [permissionStatus, setPermissionStatus] = useState<BrowserNotificationStatus>("default");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setPermissionStatus(getBrowserNotificationPermission());
  }, []);

  const handleRequestPush = async () => {
    setIsRequesting(true);
    const newStatus = await requestBrowserNotificationPermission();
    setPermissionStatus(newStatus);
    setIsRequesting(false);

    if (newStatus === "granted") {
      toast.success("Desktop push notifications enabled!");
      sendBrowserNotification("Notifications Active", {
        body: "MantraAssist will alert you when tasks or clinical events occur.",
      });
    } else if (newStatus === "denied") {
      toast.error("Notifications blocked by browser. Please allow in browser site settings.");
    }
  };

  const handleResetDefaults = () => {
    setAllModules(true);
    toast.success("Notification preferences reset to defaults.");
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
        return <SettingsIcon className="w-4 h-4 text-slate-600" />;
    }
  };

  const activeCount = modules.filter((m) => settings[m.id]).length;

  return (
    <div className="space-y-6 max-w-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* ── Page Header Strip ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-base font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Notification Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose what you're notified about and where. Changes save automatically and apply to this organization.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset to defaults</span>
        </button>
      </div>

      {/* ── Card 1: Browser Push Notifications ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
              Browser Push Notifications
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {permissionStatus === "granted" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Push is ON
              </span>
            ) : permissionStatus === "denied" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Blocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Push is OFF
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-800">
              {permissionStatus === "granted"
                ? "This browser is configured to receive desktop notifications"
                : permissionStatus === "denied"
                ? "Notifications are blocked by your browser settings"
                : "This browser: Push is off"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {permissionStatus === "granted"
                ? "You will receive real-time notifications even when working in another tab or application."
                : permissionStatus === "denied"
                ? "Click the lock icon in your browser address bar to allow notifications for this site."
                : "Turn on browser push notifications to get alerts while MantraAssist is open in the background."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permissionStatus === "default" && (
              <button
                type="button"
                disabled={isRequesting}
                onClick={handleRequestPush}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{isRequesting ? "Requesting..." : "Turn on push"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Card 2: Per-Module Notification Permissions (13 Modules) ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
              Module Notification Channels
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeCount} of {modules.length} modules enabled to send notifications
            </p>
          </div>

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

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {modules.map((mod) => {
            const isEnabled = Boolean(settings[mod.id]);
            return (
              <div
                key={mod.id}
                className="p-3.5 px-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                    {getModuleIcon(mod.id)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{mod.label}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{mod.description}</p>
                  </div>
                </div>

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
        </div>
      </div>
    </div>
  );
}

