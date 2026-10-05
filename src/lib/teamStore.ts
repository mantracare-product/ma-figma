import { useState, useEffect } from "react";

export interface TeamMember {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
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
  },
];

const LEGACY_MOCK_NAMES = new Set([
  "abhishe prod",
  "avani test",
  "avani malviya",
  "vaibhav bhardwaj",
  "anshul gupta",
  "ritika sahni",
  "navodya",
  "varsha",
  "karan hinduja",
  "john smith",
  "sarah johnson",
  "michael chen",
  "emily davis",
  "dr. robert martinez",
  "lisa anderson",
  "james wilson",
  "john agent",
  "alex turner",
]);

function cleanLegacyMembers(list: any[]): TeamMember[] {
  const filtered = list.filter((m) => m && m.name && !LEGACY_MOCK_NAMES.has(m.name.toLowerCase()));
  if (!filtered.some((m) => m.name.toLowerCase() === "admin user" || (m.role && m.role.toLowerCase() === "admin"))) {
    return [...INITIAL_TEAM_MEMBERS, ...filtered];
  }
  return filtered;
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
    const serialized = JSON.stringify(members);
    localStorage.setItem(TEAM_STORAGE_KEY, serialized);
    localStorage.setItem(SETTINGS_USERS_KEY, serialized);
    sessionStorage.setItem(SETTINGS_USERS_KEY, serialized);
    window.dispatchEvent(new Event(TEAM_STORE_EVENT));
    window.dispatchEvent(new Event("storage"));
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
  const nextId = newMember.id || (Math.max(...members.map((m) => Number(m.id) || 0), 0) + 1);
  const created: TeamMember = {
    ...newMember,
    id: nextId,
    status: newMember.status !== undefined ? newMember.status : true,
    canBookAppointments: newMember.canBookAppointments !== undefined ? newMember.canBookAppointments : false,
    locations: newMember.locations || (newMember as any).availableLocations || [],
  };
  const updated = [...members, created];
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
