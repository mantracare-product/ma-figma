import { useState, useEffect } from "react";

export interface TeamMember {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  /** Id of the Role (rolesStore) assigned to this member; `role` stays the display name. */
  roleId?: string;
  department?: string;
  departments?: string[];
  assignedDepartments?: Array<{ department: string; role: string }>;
  status?: boolean;
  organizationId?: string;
  canBookAppointments?: boolean; // Controls whether this user appears in Appointments
  calendarConnected?: boolean;
  connectedCalendar?: "google" | "outlook" | null;
  availability?: any;
  daysOff?: string[];
  assignedServices?: number[];
  permissions?: any;
  locations?: string[]; // Location IDs/names where the member is available
  availableLocations?: string[];
  /** Provider billing credentials (R5-fix.5) */
  npi?: string;
  taxonomy?: string;
  licenseNumber?: string;
  licenseState?: string;
  providesServices?: boolean;
  isRenderingProvider?: boolean;
  customFields?: Record<string, any>;
}

export const TEAM_STORE_EVENT = "mantra_team_members_updated";
const TEAM_STORAGE_KEY = "mantra_team_members";
const SETTINGS_USERS_KEY = "settings_allUsers";

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@mantra.care",
    role: "Admin",
    department: "Administration",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    connectedCalendar: "google",
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
    npi: "1111111112",
    taxonomy: "207W00000X",
    licenseNumber: "LIC-0001",
    licenseState: "CA",
    customFields: { npi: "1111111112", taxonomy: "207W00000X", licenseNumber: "LIC-0001", licenseState: "CA" },
  },
  {
    id: 2,
    name: "Akshita Sharma",
    email: "akshita.sharma@mantra.care",
    role: "Ophthalmologist",
    department: "Clinical",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
    npi: "2222222228",
    taxonomy: "207WX0009X",
    licenseNumber: "LIC-0002",
    licenseState: "CA",
    customFields: { npi: "2222222228", taxonomy: "207WX0009X", licenseNumber: "LIC-0002", licenseState: "CA" },
  },
  {
    id: 3,
    name: "Alice",
    email: "alice@mantra.care",
    role: "Senior Surgeon",
    department: "Surgery",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
    npi: "3333333334",
    taxonomy: "152W00000X",
    licenseNumber: "LIC-0003",
    licenseState: "CA",
    customFields: { npi: "3333333334", taxonomy: "152W00000X", licenseNumber: "LIC-0003", licenseState: "CA" },
  },
  {
    id: 4,
    name: "Charu Arora",
    email: "charu@mantra.care",
    role: "Physician",
    department: "Consultation",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
  },
];

export function cleanLegacyMembers(list: any[]): TeamMember[] {
  if (!Array.isArray(list)) return INITIAL_TEAM_MEMBERS;
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: TeamMember[] = [];

  for (const m of list) {
    if (!m || !m.name) continue;
    const emailKey = (m.email || "").toLowerCase().trim();
    const idKey = String(m.id ?? "").trim();
    const nameKey = (m.name || "").toLowerCase().trim();

    if (emailKey && seenEmails.has(emailKey)) continue;
    if (idKey && seenIds.has(idKey)) continue;
    if (nameKey && emailKey && seenNames.has(`${nameKey}::${emailKey}`)) continue;

    if (emailKey) seenEmails.add(emailKey);
    if (idKey) seenIds.add(idKey);
    if (nameKey && emailKey) seenNames.add(`${nameKey}::${emailKey}`);
    deduped.push(m);
  }

  let filtered = deduped;

  // Ensure primary demo clinicians (Akshita Sharma & Alice) are always available
  if (!filtered.some((m) => m.name?.toLowerCase().includes("akshita"))) {
    filtered.push(INITIAL_TEAM_MEMBERS[1]);
  }
  if (!filtered.some((m) => m.name?.toLowerCase().includes("alice"))) {
    filtered.push(INITIAL_TEAM_MEMBERS[2]);
  }

  if (!filtered.some((m) => m.name.toLowerCase() === "admin user" || (m.role && m.role.toLowerCase() === "admin"))) {
    return [INITIAL_TEAM_MEMBERS[0], ...filtered];
  }
  return filtered.map((m) => {
    if (m.name?.toLowerCase() === "admin user" && (!m.locations || m.locations.length === 0)) {
      return {
        ...m,
        locations: ["California", "California Branch", "Online"],
        availableLocations: ["California", "California Branch", "Online"],
      };
    }
    return m;
  });
}

export function getStoredTeamMembers(): TeamMember[] {
  try {
    const rawLocal = localStorage.getItem(TEAM_STORAGE_KEY) || localStorage.getItem(SETTINGS_USERS_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanLegacyMembers(parsed);
      }
    }
    const rawSession = sessionStorage.getItem(SETTINGS_USERS_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanLegacyMembers(parsed);
      }
    }
  } catch {}
  return INITIAL_TEAM_MEMBERS;
}

export function saveStoredTeamMembers(members: TeamMember[]) {
  try {
    const cleaned = cleanLegacyMembers(members);
    const serialized = JSON.stringify(cleaned);
    localStorage.setItem(TEAM_STORAGE_KEY, serialized);
    localStorage.setItem(SETTINGS_USERS_KEY, serialized);
    sessionStorage.setItem(SETTINGS_USERS_KEY, serialized);
    window.dispatchEvent(new Event(TEAM_STORE_EVENT));
    window.dispatchEvent(new Event("storage"));
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("mantra_team_chat_channel");
        bc.postMessage({ type: "TEAM_MEMBERS_UPDATED" });
        bc.close();
      }
    } catch {}
  } catch {}
}

export function enableAppointmentBooking(memberId: string | number): TeamMember[] {
  const members = getStoredTeamMembers();
  const updated = members.map((m) =>
    String(m.id) === String(memberId) ? { ...m, canBookAppointments: true } : m
  );
  saveStoredTeamMembers(updated);
  return updated;
}

export function enableMultipleAppointmentBooking(memberIds: (string | number)[]): TeamMember[] {
  const idSet = new Set(memberIds.map(String));
  const members = getStoredTeamMembers();
  const updated = members.map((m) =>
    idSet.has(String(m.id)) ? { ...m, canBookAppointments: true } : m
  );
  saveStoredTeamMembers(updated);
  return updated;
}

export function addTeamMemberToStore(newMember: Omit<TeamMember, "id"> & { id?: string | number }): TeamMember {
  const members = getStoredTeamMembers();
  const normalizedEmail = (newMember.email || "").toLowerCase().trim();
  const normalizedName = (newMember.name || "").toLowerCase().trim();

  // Check if member already exists by email or name
  const existingIndex = members.findIndex((m) => {
    const mEmail = (m.email || "").toLowerCase().trim();
    const mName = (m.name || "").toLowerCase().trim();
    if (normalizedEmail && mEmail === normalizedEmail) return true;
    if (normalizedName && mName === normalizedName) return true;
    return false;
  });

  if (existingIndex >= 0) {
    const existing = members[existingIndex];
    const updatedMember: TeamMember = {
      ...existing,
      ...newMember,
      id: existing.id,
      status: newMember.status !== undefined ? newMember.status : true,
      locations: newMember.locations || (newMember as any).availableLocations || existing.locations || [],
    };
    const updated = cleanLegacyMembers(
      members.map((m, idx) => (idx === existingIndex ? updatedMember : m))
    );
    saveStoredTeamMembers(updated);
    return updatedMember;
  }

  const nextId = newMember.id || (Math.max(...members.map((m) => Number(m.id) || 0), 0) + 1);
  const created: TeamMember = {
    ...newMember,
    id: nextId,
    status: newMember.status !== undefined ? newMember.status : true,
    canBookAppointments: newMember.canBookAppointments !== undefined ? newMember.canBookAppointments : false,
    locations: newMember.locations || (newMember as any).availableLocations || [],
  };
  const updated = cleanLegacyMembers([...members, created]);
  saveStoredTeamMembers(updated);
  return created;
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembersState] = useState<TeamMember[]>(getStoredTeamMembers);

  useEffect(() => {
    const handler = () => {
      setTeamMembersState(getStoredTeamMembers());
    };
    window.addEventListener(TEAM_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(TEAM_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setTeamMembers = (newMembers: TeamMember[] | ((prev: TeamMember[]) => TeamMember[])) => {
    setTeamMembersState((prev) => {
      const updated = typeof newMembers === "function" ? newMembers(prev) : newMembers;
      saveStoredTeamMembers(updated);
      return updated;
    });
  };

  const bookableMembers = teamMembers.filter((m) => m.canBookAppointments === true);
  const nonBookableMembers = teamMembers.filter((m) => !m.canBookAppointments);

  return {
    teamMembers,
    setTeamMembers,
    bookableMembers,
    nonBookableMembers,
    enableBooking: (id: string | number) => enableAppointmentBooking(id),
    enableMultipleBooking: (ids: (string | number)[]) => enableMultipleAppointmentBooking(ids),
    addMember: (m: Omit<TeamMember, "id"> & { id?: string | number }) => addTeamMemberToStore(m),
  };
}
