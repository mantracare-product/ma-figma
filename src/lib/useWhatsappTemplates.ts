import { useState, useEffect } from "react";
import { WhatsappTemplate } from "../app/pages/Chats";

export const WHATSAPP_TEMPLATES_EVENT = "whatsappGlobalTemplates_updated";

export const DEFAULT_TEMPLATES: WhatsappTemplate[] = [
  {
    id: "tpl-1",
    name: "Appointment Reminder",
    identifier: "appointment_reminder",
    category: "Utility",
    language: "English",
    header: { type: "text", content: "Upcoming Appointment" },
    headerType: "text",
    headerText: "Upcoming Appointment Reminder",
    bodyText: "Hi {{contact_name}}, this is a friendly reminder for your upcoming appointment on {{appointment_date}} at {{appointment_time}}.",
    footerText: "Reply STOP to unsubscribe",
    buttons: [
      { type: "quick_reply", label: "Confirm Attendance" },
      { type: "quick_reply", label: "Reschedule Visit" }
    ],
    approvalStatus: "approved",
    createdAt: "2026-06-20",
  },
  {
    id: "tpl-2",
    name: "Booking Confirmation",
    identifier: "booking_confirmation",
    category: "Utility",
    language: "English",
    header: { type: "none", content: "" },
    headerType: "none",
    bodyText: "Thank you {{contact_name}}! Your appointment for {{service_name}} on {{appointment_date}} has been successfully booked.",
    footerText: "MantraCare Health",
    buttons: [
      { type: "url", label: "View Location", value: "https://maps.google.com" },
      { type: "call", label: "Call Clinic", value: "+18005550199" }
    ],
    approvalStatus: "approved",
    createdAt: "2026-06-22",
  },
  {
    id: "tpl-3",
    name: "Post-Consultation Feedback",
    identifier: "post_consultation_feedback",
    category: "Marketing",
    language: "English",
    header: { type: "none", content: "" },
    headerType: "none",
    bodyText: "Hello {{contact_name}}, thank you for your consultation today. How was your experience with our care team?",
    buttons: [
      { type: "quick_reply", label: "⭐⭐⭐⭐⭐ Excellent" },
      { type: "quick_reply", label: "Leave Feedback" }
    ],
    approvalStatus: "pending",
    createdAt: "2026-06-25",
  },
];

export function getStoredTemplates(): WhatsappTemplate[] {
  try {
    const stored = localStorage.getItem("whatsappGlobalTemplates");
    if (!stored) {
      localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return parsed;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveStoredTemplates(templates: WhatsappTemplate[]) {
  localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(templates));
  window.dispatchEvent(new Event(WHATSAPP_TEMPLATES_EVENT));
}

export function useWhatsappTemplates() {
  const [templates, setTemplatesState] = useState<WhatsappTemplate[]>(getStoredTemplates);

  useEffect(() => {
    const handleUpdate = () => setTemplatesState(getStoredTemplates());
    window.addEventListener(WHATSAPP_TEMPLATES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WHATSAPP_TEMPLATES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setTemplates = (action: WhatsappTemplate[] | ((prev: WhatsappTemplate[]) => WhatsappTemplate[])) => {
    const current = getStoredTemplates();
    const next = typeof action === "function" ? action(current) : action;
    saveStoredTemplates(next);
    setTemplatesState(next);
  };

  return [templates, setTemplates] as const;
}
