/**
 * roomsStore.ts
 * Path: src/lib/roomsStore.ts
 *
 * Central source of truth for Clinic Rooms / Stations:
 * - Room Number
 * - Direction / Walking guidance
 * - Location (from organization locations)
 * - Service (associated clinical service)
 * - Responsible practitioner (optional)
 *
 * Used dynamically by:
 * - Products & Services page (Rooms tab)
 * - Book Appointment (auto room number mapping)
 * - AI Receptionist (live walking directions without hardcoding)
 */

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  direction: string;
  location: string;
  serviceId?: string | number;
  serviceName?: string;
  responsibleId?: string | number;
  responsibleName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROOMS_STORAGE_KEY = "mantra_rooms_v1";
export const ROOMS_CHANGED_EVENT = "mantra_rooms_changed";

export const DEFAULT_ROOMS: Room[] = [
  {
    id: "rm-101",
    roomNumber: "101",
    name: "Consultation Room 1",
    direction: "Walk past the main reception desk, turn left at the corridor; Room 101 is the first door on the right.",
    location: "California",
    serviceId: "1",
    serviceName: "Initial Consultation",
    responsibleId: "1",
    responsibleName: "Dr. John Smith",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "rm-102",
    roomNumber: "102",
    name: "Consultation Room 2",
    direction: "Walk past the main reception desk, turn left at the corridor; Room 102 is the second door on the right.",
    location: "California",
    serviceId: "2",
    serviceName: "Follow-up Visit",
    responsibleId: "2",
    responsibleName: "Dr. Sarah Johnson",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "rm-201",
    roomNumber: "201",
    name: "Dental Suite 1",
    direction: "Take the central elevator or stairs to the 2nd Floor, turn right into Wing B; Dental Suite 201 is on the left.",
    location: "California",
    serviceId: "3",
    serviceName: "Dental Cleaning",
    responsibleId: "5",
    responsibleName: "Dr. Robert Martinez",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "rm-204",
    roomNumber: "204",
    name: "Radiology & Imaging Suite",
    direction: "Take the central elevator to the 2nd Floor, proceed straight past the nurses' station; Suite 204 is marked X-Ray & Imaging.",
    location: "California",
    serviceId: "4",
    serviceName: "X-Ray Imaging",
    responsibleId: "6",
    responsibleName: "Lisa Anderson",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "rm-105",
    roomNumber: "105",
    name: "General Health Station",
    direction: "From reception, proceed straight ahead past waiting area 1; Room 105 is on your immediate left.",
    location: "California",
    serviceId: "5",
    serviceName: "General Health Consultation",
    responsibleId: "4",
    responsibleName: "Emily Davis",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
];

export function getStoredRooms(): Room[] {
  if (typeof window === "undefined") return DEFAULT_ROOMS;
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(DEFAULT_ROOMS));
      return DEFAULT_ROOMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(DEFAULT_ROOMS));
    return DEFAULT_ROOMS;
  } catch {
    return DEFAULT_ROOMS;
  }
}

export function saveRooms(rooms: Room[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    window.dispatchEvent(new CustomEvent(ROOMS_CHANGED_EVENT, { detail: rooms }));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("[roomsStore] Failed to save rooms:", err);
  }
}

export function addRoom(payload: Omit<Room, "id" | "createdAt" | "updatedAt">): Room {
  const rooms = getStoredRooms();
  const nextNum = Date.now().toString().slice(-4);
  const now = new Date().toISOString();
  const newRoom: Room = {
    ...payload,
    id: `rm-${nextNum}`,
    createdAt: now,
    updatedAt: now,
  };
  saveRooms([newRoom, ...rooms]);
  return newRoom;
}

export function updateRoom(id: string, patch: Partial<Room>): Room | null {
  const rooms = getStoredRooms();
  const idx = rooms.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: Room = {
    ...rooms[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  rooms[idx] = updated;
  saveRooms([...rooms]);
  return updated;
}

export function deleteRoom(id: string): boolean {
  const rooms = getStoredRooms();
  const filtered = rooms.filter((r) => r.id !== id);
  if (filtered.length === rooms.length) return false;
  saveRooms(filtered);
  return true;
}

/**
 * Finds the allocated Room for an appointment dynamically based on:
 * 1. Matching Location AND Product Service AND Responsible practitioner
 * 2. Room mapped to Location AND Product Service (open to any provider for that service)
 * 3. Room mapped to Location AND Responsible practitioner (dedicated provider suite)
 *
 * NOTE: A room is NEVER allocated on the basis of location alone or via arbitrary fallback.
 */
export function findRoomForAppointment(params: {
  serviceId?: string | number;
  serviceName?: string;
  location?: string;
  employeeId?: string | number;
  employeeName?: string;
}): Room | undefined {
  const rooms = getStoredRooms().filter((r) => r.isActive !== false);
  if (rooms.length === 0) return undefined;

  const targetServiceId = params.serviceId !== undefined && params.serviceId !== "" ? String(params.serviceId).trim().toLowerCase() : "";
  const targetServiceName = params.serviceName ? params.serviceName.trim().toLowerCase() : "";
  const targetLoc = params.location ? params.location.trim().toLowerCase() : "";
  const targetEmpId = params.employeeId !== undefined && params.employeeId !== "" ? String(params.employeeId).trim().toLowerCase() : "";
  const targetEmpName = params.employeeName ? params.employeeName.trim().toLowerCase() : "";

  // If online session or location is empty, no physical room can be allocated
  if (!targetLoc || targetLoc === "online") return undefined;

  // Normalizer for location strings (e.g., "California Branch" matches "California")
  const matchLocation = (r: Room) => {
    if (!targetLoc || targetLoc === "online") return false;
    const rLoc = (r.location || "").trim().toLowerCase().replace(/\s+(branch|clinic|center|suite|hospital)$/i, "").trim();
    const cleanTargetLoc = targetLoc.replace(/\s+(branch|clinic|center|suite|hospital)$/i, "").trim();
    return rLoc === cleanTargetLoc || rLoc.includes(cleanTargetLoc) || cleanTargetLoc.includes(rLoc);
  };

  // Normalizer for responsible staff (strips Dr., titles, handles name and ID matching)
  const matchResponsible = (r: Room) => {
    if (!targetEmpId && !targetEmpName) return false;
    const rEmpId = r.responsibleId !== undefined && r.responsibleId !== "" ? String(r.responsibleId).trim().toLowerCase() : "";
    const rEmpName = (r.responsibleName || "").trim().toLowerCase().replace(/^dr\.\s*/i, "").trim();
    const cleanTargetName = targetEmpName.replace(/^dr\.\s*/i, "").trim();

    if (rEmpName && cleanTargetName) {
      if (rEmpName === cleanTargetName || rEmpName.includes(cleanTargetName) || cleanTargetName.includes(rEmpName)) {
        return true;
      }
      return false;
    }

    if (targetEmpId && rEmpId && targetEmpId === rEmpId) {
      return true;
    }

    return false;
  };

  // Normalizer for service matching (ID and name)
  const matchService = (r: Room) => {
    if (!targetServiceId && !targetServiceName) return false;
    const rSrvId = r.serviceId !== undefined && r.serviceId !== "" ? String(r.serviceId).trim().toLowerCase() : "";
    const rSrvName = (r.serviceName || "").trim().toLowerCase();

    if (rSrvName && targetServiceName) {
      if (rSrvName === targetServiceName || rSrvName.includes(targetServiceName) || targetServiceName.includes(rSrvName)) {
        return true;
      }
    }

    if (targetServiceId && rSrvId && targetServiceId === rSrvId) {
      return true;
    }

    return false;
  };

  // Filter rooms that belong to this location first
  const locationRooms = rooms.filter(matchLocation);
  if (locationRooms.length === 0) return undefined;

  // 1. Exact 3-way match: Location matches, Service matches, AND Responsible matches
  const match3 = locationRooms.find((r) => matchService(r) && matchResponsible(r));
  if (match3) return match3;

  // 2. Room mapped to Location + Service, where room has NO specific responsible assigned (open to any provider of this service)
  const matchSrvOpen = locationRooms.find((r) => matchService(r) && !r.responsibleId && !r.responsibleName);
  if (matchSrvOpen) return matchSrvOpen;

  // 3. Room mapped to Location + Responsible, where room has NO specific service assigned (dedicated provider suite for any service)
  const matchEmpOpen = locationRooms.find((r) => matchResponsible(r) && !r.serviceId && !r.serviceName);
  if (matchEmpOpen) return matchEmpOpen;

  // Do NOT match on location alone or fallback to rooms[0]
  return undefined;
}

export function onRoomsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ROOMS_CHANGED_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(ROOMS_CHANGED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
