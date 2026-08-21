export interface ClientItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
}

const CORE_CLIENTS: ClientItem[] = [
  { id: "c-1", name: "James Wilson", phoneNumber: "+1 (555) 123-4567", email: "james.w@example.com" },
  { id: "c-2", name: "Emma Brown", phoneNumber: "+1 (555) 234-5678", email: "emma.b@example.com" },
  { id: "c-3", name: "Oliver Davis", phoneNumber: "+1 (555) 345-6789", email: "oliver.d@example.com" },
  { id: "c-4", name: "Sophia Martinez", phoneNumber: "+1 (555) 456-7890", email: "sophia.m@example.com" },
  { id: "c-5", name: "Sarah Jenkins", phoneNumber: "+1 (555) 234-5678", email: "sarah.j@example.com" },
  { id: "c-6", name: "Michael Chang", phoneNumber: "+1 (555) 876-5432", email: "m.chang@example.com" },
  { id: "c-7", name: "Jessica Taylor", phoneNumber: "+1 (555) 654-3210", email: "jtaylor@example.com" },
  { id: "c-8", name: "Robert Chen", phoneNumber: "+1 (555) 789-0123", email: "rchen@example.com" },
];

export function getClientList(): ClientItem[] {
  const clientMap = new Map<string, ClientItem>();

  // 1. Add all core clients first (guaranteeing Emma Brown & all primary clients are always present)
  CORE_CLIENTS.forEach((c) => {
    clientMap.set(c.name.toLowerCase().trim(), c);
  });

  // 2. Merge clients from storage (from Clients page or newly added clients)
  try {
    const stored = sessionStorage.getItem("clients") || localStorage.getItem("clients");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((c: any, i: number) => {
          const name = (c.name || c.contactName || "").trim();
          if (name) {
            const key = name.toLowerCase();
            const existing = clientMap.get(key);
            clientMap.set(key, {
              id: existing?.id || String(c.id || `client-${i + 1}`),
              name: existing?.name || name,
              phoneNumber: c.phoneNumber || c.phone || existing?.phoneNumber || "",
              email: c.email || existing?.email || "",
            });
          }
        });
      }
    }
  } catch {}

  const result = Array.from(clientMap.values());
  // Sort alphabetically by name
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
