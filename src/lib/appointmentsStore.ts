/**
 * appointmentsStore.ts
 *
 * Centralized store for appointments backed by localStorage("appointments_v1")
 * with sessionStorage fallback and cross-window broadcast synchronization.
 */

import { broadcastSync, onSyncEvent } from "./syncBroadcast";

export interface Appointment {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number | string;
  serviceId: number | string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept" | "arrived";
  notes?: string;
  rating?: number;
  title?: string;
  description?: string;
  tags?: string[];
  processId?: string;
  stageId?: string;
  qrCode?: string;
  doctorName?: string;
  doctorEmail?: string;
  serviceName?: string;
  location?: string;
  locationCode?: "PV" | "NOIDA" | "BAHADURGARH";
  type?: "in-person" | "video";
  meetingLink?: string;
}

export const APPOINTMENTS_STORAGE_KEY = "appointments_v2";
export const APPOINTMENTS_STORE_EVENT = "appointmentsStore_updated";

if (typeof window !== "undefined") {
  onSyncEvent("APPOINTMENTS_UPDATED", () => {
    window.dispatchEvent(new Event(APPOINTMENTS_STORE_EVENT));
  });
}

export const DEFAULT_INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    clientName: "Ramesh Iyer",
    clientEmail: "ramesh.iyer@email.com",
    clientPhone: "+91 98765 43210",
    employeeId: 1,
    doctorName: "Dr. Meera Nair",
    serviceId: 1,
    serviceName: "Cataract Surgery (Right Eye)",
    title: "Cataract Surgery (Right Eye)",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    duration: 120,
    status: "scheduled",
    notes: "Right Eye Nuclear Cataract with Foldable Toric IOL",
    qrCode: "APPT-001",
    processId: "op-cataract",
    stageId: "cat-1",
    location: "OT-2 & Daycare Surgical Lounge",
  },
  {
    id: 2,
    clientName: "Ramesh Iyer",
    clientEmail: "ramesh.iyer@email.com",
    clientPhone: "+91 98765 43210",
    employeeId: 1,
    doctorName: "Dr. Meera Nair",
    serviceId: 2,
    serviceName: "Post-Op Review",
    title: "Post-Op Review",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "10:30",
    duration: 30,
    status: "scheduled",
    notes: "Right Eye post-operative corneal clarity & IOL alignment check",
    qrCode: "APPT-002",
    processId: "op-cataract",
    stageId: "cat-5",
    location: "Cornea & Refractive Clinic - Bay 2",
  },
];

export function getStoredAppointments(): Appointment[] {
  try {
    let raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(APPOINTMENTS_STORAGE_KEY, raw);
      }
    }
    if (!raw) {
      saveStoredAppointments(DEFAULT_INITIAL_APPOINTMENTS);
      return DEFAULT_INITIAL_APPOINTMENTS;
    }
    const parsed: Appointment[] = JSON.parse(raw);
    const hasRameshCataract = parsed.some(
      (a) => a.clientName.toLowerCase().includes("ramesh") && a.doctorName?.includes("Meera Nair")
    );
    if (!hasRameshCataract) {
      const merged = [
        ...DEFAULT_INITIAL_APPOINTMENTS.filter((a) => a.clientName.includes("Ramesh")),
        ...parsed.filter((a) => !a.clientName.includes("Sarah")),
      ];
      saveStoredAppointments(merged);
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_INITIAL_APPOINTMENTS;
  }
}

export function saveStoredAppointments(appointments: Appointment[]): void {
  try {
    const serialized = JSON.stringify(appointments);
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, serialized);
    sessionStorage.setItem(APPOINTMENTS_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(APPOINTMENTS_STORE_EVENT));
    broadcastSync("APPOINTMENTS_UPDATED");
  } catch {}
}

export function getAppointmentsByClient(clientNameOrEmailOrPhone: string): Appointment[] {
  const all = getStoredAppointments();
  const search = clientNameOrEmailOrPhone.toLowerCase().trim();
  return all.filter((a) => {
    return (
      a.clientName?.toLowerCase().includes(search) ||
      a.clientEmail?.toLowerCase() === search ||
      a.clientPhone?.replace(/\D/g, "").includes(search.replace(/\D/g, ""))
    );
  });
}

export function updateAppointmentStatus(
  id: number,
  status: Appointment["status"]
): Appointment | null {
  const all = getStoredAppointments();
  let updatedAppt: Appointment | null = null;
  const updated = all.map((a) => {
    if (a.id === id) {
      updatedAppt = { ...a, status };
      return updatedAppt;
    }
    return a;
  });
  if (updatedAppt) {
    saveStoredAppointments(updated);
  }
  return updatedAppt;
}

export function rescheduleAppointment(
  id: number,
  newDate: string,
  newTime: string
): Appointment | null {
  const all = getStoredAppointments();
  let updatedAppt: Appointment | null = null;
  const updated = all.map((a) => {
    if (a.id === id) {
      updatedAppt = { ...a, date: newDate, time: newTime, status: "scheduled" as const };
      return updatedAppt;
    }
    return a;
  });
  if (updatedAppt) {
    saveStoredAppointments(updated);
  }
  return updatedAppt;
}

export function cancelAppointment(id: number): boolean {
  const all = getStoredAppointments();
  const updated = all.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a));
  saveStoredAppointments(updated);
  return true;
}

export function createNewAppointment(
  appt: Omit<Appointment, "id" | "qrCode"> & { id?: number }
): Appointment {
  const all = getStoredAppointments();
  const id = appt.id || Date.now();
  const newAppt: Appointment = {
    ...appt,
    id,
    qrCode: `APPT-${id}-${Math.floor(Math.random() * 900 + 100)}`,
  };
  saveStoredAppointments([newAppt, ...all]);
  return newAppt;
}
