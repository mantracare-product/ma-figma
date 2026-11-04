/**
 * departmentStore.ts
 * Path: src/lib/departmentStore.ts
 *
 * Centralized store for Organization Departments shared across Admin and Client views.
 * Persisted in localStorage under "ma_departments".
 */

import type { Department } from "../types/permissions";

export const DEPARTMENTS_KEY = "ma_departments";
export const DEPARTMENTS_UPDATED_EVENT = "ma_departments_updated";

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: "dept_1",
    name: "Clinical Operations",
    description: "Inpatient and outpatient care teams, clinical triage, and nurse practitioners.",
  },
  {
    id: "dept_2",
    name: "Administration",
    description: "Executive operations, facility management, billing oversight, and HR.",
  },
  {
    id: "dept_3",
    name: "Customer Support",
    description: "Patient inquiries, helpdesk support, appointment scheduling, and care follow-ups.",
  },
];

export function getStoredDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    if (!raw) {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(DEFAULT_DEPARTMENTS));
      return DEFAULT_DEPARTMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number) => {
        if (typeof item === "string") {
          return { id: `dept_${idx}_${Date.now()}`, name: item, description: "" };
        }
        return {
          id: item.id || `dept_${idx}_${Date.now()}`,
          name: item.name || "",
          description: item.description || "",
        };
      });
    }
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(DEFAULT_DEPARTMENTS));
    return DEFAULT_DEPARTMENTS;
  } catch {
    return DEFAULT_DEPARTMENTS;
  }
}

export function saveStoredDepartments(deps: Department[]): void {
  try {
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(deps));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DEPARTMENTS_UPDATED_EVENT, { detail: deps }));
    }
  } catch (err) {
    console.error("Failed to save departments:", err);
  }
}

