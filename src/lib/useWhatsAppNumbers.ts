import { useState, useEffect } from "react";

export interface WhatsAppNumberEntry {
  id: string;
  displayPhoneNumber: string;
  name: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

export const WHATSAPP_NUMBERS_EVENT = "whatsappNumbers_updated";

export const DEFAULT_MOCK_NUMBERS: WhatsAppNumberEntry[] = [
  { id: "wa-mock-1", displayPhoneNumber: "+1 (555) 123-4567", name: "WhatsApp (+1 (555) 123-4567)", wabaId: "WABA-META-CLOUD-1" },
  { id: "wa-mock-2", displayPhoneNumber: "+1 (555) 987-6543", name: "WhatsApp (+1 (555) 987-6543)", wabaId: "WABA-META-CLOUD-2" },
];

export function getStoredWhatsAppNumbers(): WhatsAppNumberEntry[] {
  try {
    const raw = localStorage.getItem("whatsappTemplateIntegrations");
    if (!raw) {
      saveStoredWhatsAppNumbers(DEFAULT_MOCK_NUMBERS);
      return DEFAULT_MOCK_NUMBERS;
    }
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) {
      saveStoredWhatsAppNumbers(DEFAULT_MOCK_NUMBERS);
      return DEFAULT_MOCK_NUMBERS;
    }

    const parsed = items
      .map((item: any) => {
        const creds = item.credentials || item;
        const displayPhoneNumber =
          creds.displayPhoneNumber || item.displayPhoneNumber || creds.phoneNumberHint || "WhatsApp Number";
        const id = item.id || creds.id || `wa-${Date.now()}`;
        const name = item.name || (displayPhoneNumber ? `WhatsApp (${displayPhoneNumber})` : "WhatsApp Business");

        return {
          id,
          displayPhoneNumber,
          name,
          wabaId: creds.wabaId || item.wabaId,
          phoneNumberId: creds.phoneNumberId || item.phoneNumberId,
          businessAccountId: creds.businessAccountId || item.businessAccountId,
        };
      })
      .filter((entry) => Boolean(entry.displayPhoneNumber));

    return parsed.length > 0 ? parsed : DEFAULT_MOCK_NUMBERS;
  } catch (e) {
    console.error("Failed to parse stored WhatsApp numbers", e);
    return DEFAULT_MOCK_NUMBERS;
  }
}

export function saveStoredWhatsAppNumbers(numbers: WhatsAppNumberEntry[]) {
  const formatted = numbers.map((n) => ({
    id: n.id,
    name: n.name || (n.displayPhoneNumber ? `WhatsApp (${n.displayPhoneNumber})` : "WhatsApp Business"),
    provider: "meta",
    providerLabel: "Meta Cloud API",
    credentials: {
      id: n.id,
      displayPhoneNumber: n.displayPhoneNumber,
      wabaId: n.wabaId,
      phoneNumberId: n.phoneNumberId,
      businessAccountId: n.businessAccountId,
      connectedViaMeta: "true",
    },
  }));

  localStorage.setItem("whatsappTemplateIntegrations", JSON.stringify(formatted));
  window.dispatchEvent(new Event(WHATSAPP_NUMBERS_EVENT));
}

export function useWhatsAppNumbers() {
  const [numbers, setNumbersState] = useState<WhatsAppNumberEntry[]>(getStoredWhatsAppNumbers);

  useEffect(() => {
    const handleUpdate = () => setNumbersState(getStoredWhatsAppNumbers());
    window.addEventListener(WHATSAPP_NUMBERS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WHATSAPP_NUMBERS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setNumbers = (action: WhatsAppNumberEntry[] | ((prev: WhatsAppNumberEntry[]) => WhatsAppNumberEntry[])) => {
    const current = getStoredWhatsAppNumbers();
    const next = typeof action === "function" ? action(current) : action;
    saveStoredWhatsAppNumbers(next);
    setNumbersState(next);
  };

  return [numbers, setNumbers] as const;
}
