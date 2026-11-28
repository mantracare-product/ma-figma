import { useState, useEffect } from "react";

export interface WebsiteTemplate {
  id: string;
  name: string;
  shortcut: string;
  category: string;
  channelId: string; // "all" or specific WebsiteChannel id
  bodyText: string;
  lastModified: string;
  createdAt: string;
}

const STORAGE_KEY = "mantra_website_templates";
const EVENT_NAME = "mantra_website_templates_updated";

export const DEFAULT_WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    id: "web-tpl-1",
    name: "Welcome & Quick Triage",
    shortcut: "/welcome",
    category: "Greeting",
    channelId: "all",
    bodyText:
      "Hi {{client_name}}, thanks for reaching out to {{clinic_name}}! Let me know how I can help today — booking an appointment, checking insurance, or answering questions about our services.",
    lastModified: "2 hours ago",
    createdAt: "2026-03-10",
  },
  {
    id: "web-tpl-2",
    name: "Appointment Booking Link",
    shortcut: "/book",
    category: "Scheduling",
    channelId: "all",
    bodyText:
      "You can pick a date and time that works best for you here: {{portal_url}}. If you have a preferred provider like {{doctor_name}}, feel free to mention them and I can assist directly.",
    lastModified: "Yesterday",
    createdAt: "2026-03-08",
  },
  {
    id: "web-tpl-3",
    name: "Insurance & Pricing Overview",
    shortcut: "/insurance",
    category: "Billing",
    channelId: "all",
    bodyText:
      "We accept most major insurance plans at {{clinic_name}}. Share your plan name or member ID and our front desk team will verify coverage before your {{service_name}} visit.",
    lastModified: "3 days ago",
    createdAt: "2026-03-04",
  },
  {
    id: "web-tpl-4",
    name: "After-Hours Follow-Up",
    shortcut: "/afterhours",
    category: "Follow-up",
    channelId: "all",
    bodyText:
      "Our live care team is currently away, {{client_name}}, but we've saved your inquiry. Someone will follow up with you first thing tomorrow morning.",
    lastModified: "Last week",
    createdAt: "2026-02-26",
  },
];

export function getStoredWebsiteTemplates(): WebsiteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WEBSITE_TEMPLATES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WEBSITE_TEMPLATES;
  } catch {
    return DEFAULT_WEBSITE_TEMPLATES;
  }
}

export function saveWebsiteTemplates(templates: WebsiteTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error("Failed to save website templates", e);
  }
}

export function useWebsiteTemplates() {
  const [templates, setTemplates] = useState<WebsiteTemplate[]>(getStoredWebsiteTemplates);

  useEffect(() => {
    const sync = () => setTemplates(getStoredWebsiteTemplates());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updateTemplates = (
    updater: WebsiteTemplate[] | ((prev: WebsiteTemplate[]) => WebsiteTemplate[])
  ) => {
    const next = typeof updater === "function" ? updater(getStoredWebsiteTemplates()) : updater;
    saveWebsiteTemplates(next);
    setTemplates(next);
  };

  return { templates, updateTemplates };
}
