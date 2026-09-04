/**
 * Current authenticated user and team member resolution
 * Tied to AuthContext, Profile, and UserManagement definitions
 */

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const SYSTEM_TEAM_MEMBERS: SystemUser[] = [
  { id: "1", name: "Admin User", email: "admin@healthcare.com", role: "Admin" },
  { id: "2", name: "Sarah Manager", email: "sarah.m@healthcare.com", role: "Manager" },
  { id: "3", name: "John Agent", email: "john.a@healthcare.com", role: "Agent" },
];

export function getCurrentUser(): SystemUser {
  try {
    const raw = localStorage.getItem("user_data") || sessionStorage.getItem("current_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.name) return parsed;
    }
  } catch {}

  // Default to the seeded Admin User
  return SYSTEM_TEAM_MEMBERS[0];
}

export function getAvailableTeamMembers(): SystemUser[] {
  try {
    const saved = sessionStorage.getItem("userManagement_users");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role || "Member",
        }));
      }
    }
  } catch {}

  return SYSTEM_TEAM_MEMBERS;
}
