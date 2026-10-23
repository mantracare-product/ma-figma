import { Service } from "./servicesStore";
import { Appointment } from "./appointmentService";

export interface LocationWithHours {
  id?: string;
  name?: string;
  workingHours?: Record<string, { enabled?: boolean; start?: string; end?: string }>;
  daysOff?: Array<{ id?: string; date?: string; label?: string }>;
  [key: string]: any;
}

export interface ServiceSlot {
  timeStr: string;   // e.g. "09:00"
  label12: string;   // e.g. "9:00 AM"
  hour: number;      // e.g. 9
  minute: number;    // e.g. 0
  remaining: number; // e.g. 5
  isFull: boolean;   // remaining <= 0
}

/**
 * Convert time string "HH:MM" to minutes from midnight
 */
export function timeToMinutes(t?: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Check if a service is enabled at a given location.
 * If service.locationIds is absent (undefined or empty), the service is available at all locations.
 */
export function isServiceEnabledAtLocation(
  service?: Partial<Service> | { locationIds?: string[] } | null,
  location?: LocationWithHours | string | null
): boolean {
  if (!service) return false;
  if (!service.locationIds || service.locationIds.length === 0) {
    return true; // absent = all locations
  }
  if (!location) return false;

  const locId = typeof location === "string" ? location : (location.id || "");
  const locName = typeof location === "string" ? location : (location.name || "");

  return service.locationIds.some((id) => {
    const s = String(id).trim().toLowerCase();
    return s === String(locId).trim().toLowerCase() || s === String(locName).trim().toLowerCase();
  });
}

/**
 * Calculate available slots for an appointment for a SERVICE.
 * Availability comes from the service and location only.
 * 
 * @param service - Selected Service object
 * @param location - Selected Location object with workingHours and daysOff
 * @param date - Target date in "YYYY-MM-DD" format
 * @param appointments - List of all existing appointments
 * @returns Array of ServiceSlot [{ timeStr, label12, remaining, isFull }]
 */
export function getServiceSlots(
  service: Service | null | undefined,
  location: LocationWithHours | null | undefined,
  date: string | null | undefined,
  appointments: Appointment[] = []
): ServiceSlot[] {
  // 1. Guard clauses: Service, Location, Date must be provided
  if (!service || !location || !date || !date.trim()) {
    return [];
  }

  // 1. If the service is not enabled at the location, return []
  if (!isServiceEnabledAtLocation(service, location)) {
    return [];
  }

  // 2. If the location is closed on that weekday or date, return []
  // 2a. Check Location Days Off
  if (Array.isArray(location.daysOff)) {
    const isDayOff = location.daysOff.some((d) => d.date === date);
    if (isDayOff) {
      return [];
    }
  }

  // 2b. Check Location Operating Hours for that weekday
  const [yr, mo, dy] = date.split("-").map(Number);
  const dateObj = new Date(yr, (mo || 1) - 1, dy || 1);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayKey = dayNames[dateObj.getDay()];

  const dayConfig = location.workingHours?.[dayKey];
  if (dayConfig && dayConfig.enabled === false) {
    return [];
  }

  // 3. Window = location open to close for that weekday
  let openMin = 9 * 60;  // Default 09:00 (9 AM)
  let closeMin = 18 * 60; // Default 18:00 (6 PM)

  if (dayConfig) {
    if (dayConfig.start) {
      openMin = timeToMinutes(dayConfig.start);
    }
    if (dayConfig.end) {
      closeMin = timeToMinutes(dayConfig.end);
    }
  }

  // 4. Step = service duration (same default as existing engine: 30 minutes)
  const duration = typeof service.duration === "number" && service.duration > 0 ? service.duration : 30;

  const locName = location.name ? location.name.trim().toLowerCase() : "";
  const locId = location.id ? String(location.id).trim().toLowerCase() : "";

  // Max seats configured for this service (checks location-specific seat overrides first, then service.maxSeats, default 1)
  let maxSeats = typeof service.maxSeats === "number" && service.maxSeats >= 1 ? service.maxSeats : 1;
  const locSeats = (service as any).locationSeats;
  if (locSeats && typeof locSeats === "object") {
    if (locId && typeof locSeats[locId] === "number") {
      maxSeats = locSeats[locId];
    } else if (locName && typeof locSeats[locName] === "number") {
      maxSeats = locSeats[locName];
    } else {
      const matchKey = Object.keys(locSeats).find(
        (k) => k.toLowerCase() === locId || k.toLowerCase() === locName
      );
      if (matchKey && typeof locSeats[matchKey] === "number") {
        maxSeats = locSeats[matchKey];
      }
    }
  }

  // 5. For each start while start + duration <= close:
  // booked = count of non-cancelled appointments with the same serviceId, same location, same date,
  // time overlapping [start, start + duration), and bookingType "service".
  // remaining = (maxSeats ?? 1) - booked.
  const slots: ServiceSlot[] = [];

  for (let current = openMin; current + duration <= closeMin; current += duration) {
    const slotStart = current;
    const slotEnd = current + duration;

    let booked = 0;

    for (const apt of appointments) {
      if (!apt || apt.status === "cancelled") continue;
      if (apt.date !== date) continue;
      if (String(apt.serviceId) !== String(service.id)) continue;

      // Only count appointments booked with bookingType "service"
      if (apt.bookingType !== "service") continue;

      // Match Location by name or ID
      const aptLocName = apt.location ? apt.location.trim().toLowerCase() : "";
      const aptLocId = (apt as any).locationId ? String((apt as any).locationId).trim().toLowerCase() : "";
      const matchLoc =
        (locName && aptLocName === locName) ||
        (locId && (aptLocId === locId || aptLocName === locId)) ||
        (!locName && !locId);

      if (!matchLoc) continue;

      // Check time overlap [slotStart, slotEnd)
      if (apt.time) {
        const aptStart = timeToMinutes(apt.time);
        const aptDuration = typeof apt.duration === "number" && apt.duration > 0 ? apt.duration : duration;
        const aptEnd = aptStart + aptDuration;

        // Interval overlap: aptStart < slotEnd && slotStart < aptEnd
        if (aptStart < slotEnd && slotStart < aptEnd) {
          booked++;
        }
      }
    }

    const remaining = Math.max(0, maxSeats - booked);
    const isFull = remaining <= 0;

    const h = Math.floor(current / 60);
    const m = current % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const p = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label12 = `${h12}:${String(m).padStart(2, "0")} ${p}`;

    slots.push({
      timeStr,
      label12,
      hour: h,
      minute: m,
      remaining,
      isFull,
    });
  }

  // 6. Return generated slots (doctor schedules, doctor days off and doctor conflicts are NOT used here)
  return slots;
}
