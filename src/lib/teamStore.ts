import { useState, useEffect } from "react";

export interface TeamMember {
  id: number | string;
  name: string;
  email: string;
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
}

export const TEAM_STORE_EVENT = "mantra_team_members_updated";
const TEAM_STORAGE_KEY = "mantra_team_members";
const SETTINGS_USERS_KEY = "settings_allUsers";

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@healthcare.com",
    role: "Admin",
    department: "Engineering",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    connectedCalendar: "google",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@healthcare.com",
    role: "Manager",
    department: "Medical",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
    calendarConnected: true,
    connectedCalendar: "outlook",
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "michael.c@healthcare.com",
    role: "Sales",
    department: "Sales",
    status: true,
    organizationId: "1",
    canBookAppointments: false, // Cannot book appointments initially
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.d@healthcare.com",
    role: "Reception",
    department: "Reception",
    status: true,
    organizationId: "1",
    canBookAppointments: true,
  },
  {
    id: 5,
    name: "Dr. Robert Martinez",
    email: "robert.m@dentalcare.com",
    role: "Admin",
    department: "Medical",
    status: true,
    organizationId: "2",
    canBookAppointments: true,
  },
  {
    id: 6,
    name: "Lisa Anderson",
    email: "lisa.a@dentalcare.com",
    role: "Manager",
    department: "Medical",
    status: true,
    organizationId: "2",
    canBookAppointments: true,
  },
  {
    id: 7,
    name: "James Wilson",
    email: "james.w@dentalcare.com",
    role: "Reception",
    department: "Reception",
    status: true,
    organizationId: "2",
    canBookAppointments: false, // Cannot book appointments initially
  },
];

export function getStoredTeamMembers(): TeamMember[] {
  try {
    const rawLocal = localStorage.getItem(TEAM_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawSession = sessionStorage.getItem(SETTINGS_USERS_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure canBookAppointments is preserved or initialized
        return parsed.map((u: any) => {
          if (u.canBookAppointments !== undefined) return u;
          const matchedInit = INITIAL_TEAM_MEMBERS.find((init) => String(init.id) === String(u.id));
          return {
            ...u,
            canBookAppointments: matchedInit ? matchedInit.canBookAppointments : true,
          };
        });
      }
    }
  } catch {}
  return INITIAL_TEAM_MEMBERS;
}

export function saveStoredTeamMembers(members: TeamMember[]) {
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
    sessionStorage.setItem(SETTINGS_USERS_KEY, JSON.stringify(members));
    window.dispatchEvent(new Event(TEAM_STORE_EVENT));
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

export function addTeamMemberToStore(newMember: Omit<TeamMember, "id"> & { id?: string | number }): TeamMember {
  const members = getStoredTeamMembers();
  const nextId = newMember.id || (Math.max(...members.map((m) => Number(m.id) || 0), 0) + 1);
  const created: TeamMember = {
    ...newMember,
    id: nextId,
    status: newMember.status !== undefined ? newMember.status : true,
    canBookAppointments: newMember.canBookAppointments !== undefined ? newMember.canBookAppointments : false,
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
    addMember: (m: Omit<TeamMember, "id"> & { id?: string | number }) => addTeamMemberToStore(m),
  };
}
