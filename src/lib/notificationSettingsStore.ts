import { useState, useEffect, useCallback } from "react";

export const NOTIFICATION_SETTINGS_STORAGE_KEY = "mantra_notification_settings_v1";
export const NOTIFICATION_SETTINGS_EVENT = "mantra-notification-settings-updated";

export interface NotificationModuleConfig {
  id: string;
  label: string;
  description: string;
}

// Exact modules matching Roles & Permissions console plus tasks/chats
export const ROLE_NOTIFICATION_MODULES: NotificationModuleConfig[] = [
  { id: "appointments", label: "Appointments", description: "Booking reminders, rescheduling alerts, and cancellations" },
  { id: "billings", label: "Billings", description: "Invoice settlements, payments, refunds, and dispute notices" },
  { id: "calls", label: "Calls", description: "Incoming clinical call alerts, voicemails, and transcript summaries" },
  { id: "chats", label: "Chats", description: "Doctor-patient communications, staff group messages, and AI bot notes" },
  { id: "clients", label: "Clients", description: "New patient onboarding, profile updates, and chart activations" },
  { id: "dashboard", label: "Dashboard", description: "Executive KPI changes, practice revenue alerts, and daily metrics" },
  { id: "documentTemplates", label: "DocumentTemplates", description: "Clinical protocols, signed consent disclosures, and HIPAA forms" },
  { id: "integrations", label: "Integrations", description: "EHR sync events, clearinghouse alerts, and Webhook logs" },
  { id: "knowledgeBase", label: "KnowledgeBase", description: "Care guidelines updates and internal protocol revisions" },
  { id: "processes", label: "Processes", description: "Care pathway automated triggers and workflow stage movements" },
  { id: "settings", label: "Settings", description: "Security changes, role permission updates, and system notices" },
  { id: "tasks", label: "Tasks", description: "Task delegations, checklist items, observer updates, and deadlines" },
  { id: "webForms", label: "WebForms", description: "Patient intake questionnaire responses and digital form submissions" },
];

export type ModuleNotificationSettings = Record<string, boolean>;

export function getDefaultModuleSettings(): ModuleNotificationSettings {
  const result: ModuleNotificationSettings = {};
  ROLE_NOTIFICATION_MODULES.forEach((mod) => {
    result[mod.id] = true;
  });
  return result;
}

export function getStoredNotificationSettings(): ModuleNotificationSettings {
  if (typeof window === "undefined") return getDefaultModuleSettings();
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultModuleSettings();
      localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const defaults = getDefaultModuleSettings();
    return { ...defaults, ...parsed };
  } catch {
    return getDefaultModuleSettings();
  }
}

export function saveStoredNotificationSettings(settings: ModuleNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, { detail: settings }));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to save notification settings:", err);
  }
}

export function isModuleNotificationAllowed(moduleIdOrType?: string): boolean {
  if (!moduleIdOrType) return true;
  const settings = getStoredNotificationSettings();

  // Normalize type aliases to module ids
  const normalizedKey =
    moduleIdOrType === "task"
      ? "tasks"
      : moduleIdOrType === "chat"
      ? "chats"
      : moduleIdOrType === "billing"
      ? "billings"
      : moduleIdOrType === "process"
      ? "processes"
      : moduleIdOrType === "system"
      ? "settings"
      : moduleIdOrType;

  if (normalizedKey in settings) {
    return Boolean(settings[normalizedKey]);
  }
  return true;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<ModuleNotificationSettings>(() => getStoredNotificationSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getStoredNotificationSettings());
    };
    window.addEventListener(NOTIFICATION_SETTINGS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const toggleModule = useCallback((moduleId: string) => {
    const current = getStoredNotificationSettings();
    const updated = {
      ...current,
      [moduleId]: !current[moduleId],
    };
    saveStoredNotificationSettings(updated);
  }, []);

  const setAllModules = useCallback((enabled: boolean) => {
    const updated: ModuleNotificationSettings = {};
    ROLE_NOTIFICATION_MODULES.forEach((mod) => {
      updated[mod.id] = enabled;
    });
    saveStoredNotificationSettings(updated);
  }, []);

  return {
    settings,
    modules: ROLE_NOTIFICATION_MODULES,
    toggleModule,
    setAllModules,
  };
}

