export interface ClientItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
}

export function getClientList(): ClientItem[] {
  let loaded: ClientItem[] = [];
  try {
    const stored = sessionStorage.getItem("clients") || localStorage.getItem("clients");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loaded = parsed.map((c: any, i: number) => ({
          id: String(c.id || `client-${i + 1}`),
          name: c.name || c.contactName || `Client ${i + 1}`,
          phoneNumber: c.phoneNumber || c.phone || "",
          email: c.email || "",
        }));
      }
    }
  } catch {}

  if (loaded.length === 0) {
    // Default fallback mock client list if none in storage
    loaded = [
      { id: "c-1", name: "James Wilson", phoneNumber: "+1 (555) 123-4567", email: "james.w@example.com" },
      { id: "c-2", name: "Emma Brown", phoneNumber: "+1 (555) 234-5678", email: "emma.b@example.com" },
      { id: "c-3", name: "Oliver Davis", phoneNumber: "+1 (555) 345-6789", email: "oliver.d@example.com" },
      { id: "c-4", name: "Sophia Martinez", phoneNumber: "+1 (555) 456-7890", email: "sophia.m@example.com" },
      { id: "c-5", name: "Sarah Jenkins", phoneNumber: "+1 (555) 234-5678", email: "sarah.j@example.com" },
      { id: "c-6", name: "Michael Chang", phoneNumber: "+1 (555) 876-5432", email: "m.chang@example.com" },
      { id: "c-7", name: "Jessica Taylor", phoneNumber: "+1 (555) 654-3210", email: "jtaylor@example.com" },
      { id: "c-8", name: "Robert Chen", phoneNumber: "+1 (555) 789-0123", email: "rchen@example.com" },
    ];
  }

  return loaded;
}
