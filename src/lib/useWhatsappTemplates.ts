import { useState, useEffect } from "react";
import { WhatsappTemplate } from "../app/pages/Chats";

export const WHATSAPP_TEMPLATES_EVENT = "whatsappGlobalTemplates_updated";

export function getStoredTemplates(): WhatsappTemplate[] {
  try {
    const stored = localStorage.getItem("whatsappGlobalTemplates");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
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
