// ─── Shared Services / Products Store ────────────────────────────────────────
// Single source of truth for the Products & Services catalogue.
// Both Services.tsx and ClientProfile.tsx import from here so that
// a product created from within a client profile also appears globally.

const STORE_KEY = "ma_services_store";
const CHANGE_EVENT = "ma_services_changed";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Service {
  id: number;
  name: string;
  description: string;
  category?: string;
  duration: number;
  price: number;
  currency: string;
  tax?: number;
  isActive: boolean;
  assignedEmployees?: number[];
  createdAt?: string;
  activity?: string;
  customFields?: Record<string, any>;
}

// Per-client product assignments: clientId → array of service ids
const CLIENT_PRODUCTS_KEY = "ma_client_products";

// ─── Constants ────────────────────────────────────────────────────────────────

export const EMPLOYEES = [
  { id: 1, name: "James Davis",   initials: "JD", color: "#1F2937", role: "Senior Agent" },
  { id: 2, name: "Sarah Miller",  initials: "SM", color: "#1F2937", role: "Agent" },
  { id: 3, name: "Rachel Park",   initials: "RP", color: "#1F2937", role: "Manager" },
  { id: 4, name: "Tom Kumar",     initials: "TK", color: "#1F2937", role: "Agent" },
  { id: 5, name: "Amy Lee",       initials: "AL", color: "#1F2937", role: "Senior Agent" },
  { id: 6, name: "David Chen",    initials: "DC", color: "#1F2937", role: "Agent" },
  { id: 7, name: "Emma Wilson",   initials: "EW", color: "#1F2937", role: "Senior Agent" },
  { id: 8, name: "Michael Brown", initials: "MB", color: "#1F2937", role: "Supervisor" },
];

export const CURRENCIES = [
  { code: "USD", symbol: "$",   label: "US Dollar" },
  { code: "EUR", symbol: "€",   label: "Euro" },
  { code: "GBP", symbol: "£",   label: "British Pound" },
  { code: "INR", symbol: "₹",   label: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar" },
  { code: "CAD", symbol: "C$",  label: "Canadian Dollar" },
  { code: "SGD", symbol: "S$",  label: "Singapore Dollar" },
  { code: "JPY", symbol: "¥",   label: "Japanese Yen" },
  { code: "SAR", symbol: "﷼",   label: "Saudi Riyal" },
];

export const getCurrencySymbol = (code: string) =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

export const INIT_FORM = {
  name: "",
  description: "",
  category: "General",
  duration: 30,
  price: 0,
  currency: "",
  tax: 0,
  isActive: true,
  assignedEmployeeIds: [] as number[],
  customFields: {} as Record<string, any>,
};

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_SERVICES: Service[] = [
  { id: 1, name: "Initial Consultation",  description: "Comprehensive first-time patient consultation and assessment", category: "Consultation", duration: 60, price: 150, currency: "USD", tax: 5, isActive: true,  assignedEmployees: [1, 2], createdAt: "2024-04-13 14:30", activity: "Last updated Apr 13" },
  { id: 2, name: "Follow-up Visit",       description: "Regular follow-up appointment for existing patients",          category: "Consultation", duration: 30, price: 75,  currency: "USD", tax: 5, isActive: true,  assignedEmployees: [1, 2, 4], createdAt: "2024-04-12 11:15", activity: "Last updated Apr 12" },
  { id: 3, name: "Dental Cleaning",       description: "Professional teeth cleaning and oral hygiene maintenance",     category: "Dental",       duration: 45, price: 120, currency: "USD", tax: 10, isActive: true,  assignedEmployees: [5, 6], createdAt: "2024-04-10 09:45", activity: "Last updated Apr 10" },
  { id: 4, name: "X-Ray Imaging",         description: "Digital radiographic imaging for diagnostic purposes",         category: "Diagnostics",  duration: 20, price: 80,  currency: "USD", tax: 0, isActive: false, assignedEmployees: [1], createdAt: "2024-04-08 16:20", activity: "Deactivated Apr 08" },
];

// ─── Store helpers ────────────────────────────────────────────────────────────

function loadServices(): Service[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Service[];
  } catch { /* ignore */ }
  return DEFAULT_SERVICES;
}

function saveServices(services: Service[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(services));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getStoredServices(): Service[] {
  return loadServices();
}

export function addService(data: Omit<Service, "id">): Service {
  const services = loadServices();
  const newId = services.length > 0 ? Math.max(...services.map((s) => s.id)) + 1 : 1;
  const newService: Service = { id: newId, ...data };
  saveServices([...services, newService]);
  return newService;
}

export function updateService(id: number, data: Partial<Omit<Service, "id">>): void {
  const services = loadServices();
  saveServices(services.map((s) => (s.id === id ? { ...s, ...data } : s)));
}

export function deleteService(id: number): void {
  const services = loadServices();
  saveServices(services.filter((s) => s.id !== id));
}

export function toggleServiceActive(id: number): void {
  const services = loadServices();
  saveServices(services.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
}

/** Subscribe to store changes; returns an unsubscribe function. */
export function onServicesChanged(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

// ─── Per-client product assignments ──────────────────────────────────────────

function loadClientProducts(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(CLIENT_PRODUCTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveClientProducts(map: Record<string, number[]>) {
  localStorage.setItem(CLIENT_PRODUCTS_KEY, JSON.stringify(map));
}

export function getClientProductIds(clientId: string): number[] {
  return loadClientProducts()[clientId] ?? [];
}

export function assignProductToClient(clientId: string, serviceId: number): void {
  const map = loadClientProducts();
  const existing = map[clientId] ?? [];
  if (!existing.includes(serviceId)) {
    map[clientId] = [...existing, serviceId];
    saveClientProducts(map);
  }
}

export function unassignProductFromClient(clientId: string, serviceId: number): void {
  const map = loadClientProducts();
  map[clientId] = (map[clientId] ?? []).filter((id) => id !== serviceId);
  saveClientProducts(map);
}

export function getClientProducts(clientId: string): Service[] {
  const ids = getClientProductIds(clientId);
  const all = loadServices();
  return all.filter((s) => ids.includes(s.id));
}
