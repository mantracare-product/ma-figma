import { useState, useEffect } from "react";

export interface TeamMember {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
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
    departments: ["Administration"],
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    connectedCalendar: "google",
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
  },
  {
    id: 2,
    name: "Akshita Sharma",
    email: "akshita.sharma@mantra.care",
    role: "Ophthalmologist",
    department: "Clinical Operations",
    departments: ["Clinical Operations"],
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
  },
  {
    id: 3,
    name: "Alice",
    email: "alice@mantra.care",
    role: "Senior Surgeon",
    department: "Customer Support",
    departments: ["Customer Support"],
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    locations: ["California", "California Branch", "Online"],
    availableLocations: ["California", "California Branch", "Online"],
  },
  {
    id: 4,
    name: "Charu Arora",
    email: "charu@mantra.care",
    role: "Physician",
    department: "Clinical Operations",
    departments: ["Clinical Operations"],
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

  let result = filtered;
  if (!result.some((m) => m.name.toLowerCase() === "admin user" || (m.role && m.role.toLowerCase() === "admin"))) {
    result = [INITIAL_TEAM_MEMBERS[0], ...result];
  }
  return result.map((m) => {
    const depts: string[] = [];
    if (Array.isArray(m.departments) && m.departments.length > 0) {
      m.departments.forEach((d) => {
        if (typeof d === "string" && d.trim() && !depts.includes(d.trim())) depts.push(d.trim());
      });
    } else if (m.department) {
      m.department.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((d: string) => {
        if (!depts.includes(d)) depts.push(d);
      });
    }
    if (Array.isArray(m.assignedDepartments)) {
      m.assignedDepartments.forEach((ad: any) => {
        if (ad && ad.department && typeof ad.department === "string" && !depts.includes(ad.department.trim())) {
          depts.push(ad.department.trim());
        }
      });
    }

    // Default/fallback department assignment if empty
    if (depts.length === 0) {
      const match = INITIAL_TEAM_MEMBERS.find(
        (im) =>
          (im.name && m.name && im.name.toLowerCase() === m.name.toLowerCase()) ||
          String(im.id) === String(m.id)
      );
      if (match && match.departments && match.departments.length > 0) {
        match.departments.forEach((d) => {
          if (!depts.includes(d)) depts.push(d);
        });
      } else {
        const lowerName = (m.name || "").toLowerCase();
        const lowerRole = (m.role || "").toLowerCase();
        if (lowerName.includes("admin") || lowerRole.includes("admin")) {
          depts.push("Administration");
        } else if (lowerName.includes("alice") || lowerRole.includes("support")) {
          depts.push("Customer Support");
        } else {
          depts.push("Clinical Operations");
        }
      }
    }
    return {
      ...m,
      departments: depts,
      department: depts.join(", ") || m.department,
      ...(m.name?.toLowerCase() === "admin user" && (!m.locations || m.locations.length === 0)
        ? {
            locations: ["California", "California Branch", "Online"],
            availableLocations: ["California", "California Branch", "Online"],
          }
        : {}),
    };
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
