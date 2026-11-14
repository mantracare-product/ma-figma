/**
 * Shared Roles store (Slice 1, item e). Roles used to live in sessionStorage["settings_roles"] inside Settings.tsx,
 * so nothing outside that page could read them. They now live in localStorage and are readable anywhere.
 */
import type { Role } from "../types/permissions";

export const ROLES_STORAGE_KEY = "settings_roles_v2";
const LEGACY_SESSION_KEY = "settings_roles";
export const ROLES_STORE_EVENT = "mantra_roles_updated";

function parse(raw: string | null): Role[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as Role[]) : null;
  } catch {
    return null;
  }
}

/**
 * Stored roles. First call with nothing stored migrates the old session list, else persists `defaults`
 * (the caller owns the seed list; this store hard-codes no role names).
 */
export function getStoredRoles(defaults: Role[] = []): Role[] {
  try {
    const local = parse(localStorage.getItem(ROLES_STORAGE_KEY));
    if (local) return local;
    const legacy = typeof sessionStorage !== "undefined" ? parse(sessionStorage.getItem(LEGACY_SESSION_KEY)) : null;
    const seed = legacy || defaults;
    if (seed.length > 0) saveStoredRoles(seed);
    return seed;
  } catch {
    return defaults;
  }
}

export function saveStoredRoles(roles: Role[]): void {
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof Event !== "undefined") {
      window.dispatchEvent(new Event(ROLES_STORE_EVENT));
    }
  } catch {
    /* ignore */
  }
}

/** Add roles that are not present yet (matched by id). Returns the merged list and how many were added. */
export function addRolesIfMissing(incoming: Role[], defaults: Role[] = []): { roles: Role[]; added: number } {
  const current = getStoredRoles(defaults);
  const have = new Set(current.map((r) => r.id));
  const fresh = incoming.filter((r) => !have.has(r.id));
  if (fresh.length === 0) return { roles: current, added: 0 };
  const roles = [...current, ...fresh];
  saveStoredRoles(roles);
  return { roles, added: fresh.length };
}
