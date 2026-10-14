import { getStoredClients } from "./clientsStore";

export interface ClientItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
}

export function getClientList(): ClientItem[] {
  const clients = getStoredClients();
  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    phoneNumber: c.phone || "",
    email: c.email || "",
  }));
}
