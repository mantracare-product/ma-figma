const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};

(global as any).localStorage = localStorageMock;
(global as any).sessionStorage = localStorageMock;
(global as any).window = {
  localStorage: localStorageMock,
  sessionStorage: localStorageMock,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).CustomEvent = class CustomEvent {
  detail: any;
  constructor(public type: string, params?: { detail?: any }) {
    this.detail = params?.detail;
  }
};
(global as any).Event = class Event {
  constructor(public type: string) {}
};

import { describe, it, expect, beforeEach } from "vitest";
import {
  syncServiceRooms,
  getStoredRooms,
  findRoomForAppointment,
} from "../../lib/roomsStore";
import { appointmentService } from "../../lib/appointmentService";

describe("Service Location Rooms Configuration & Sync", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Configure default appointment automation rule in the correct storage key
    localStorageMock.setItem(
      "mantra_global_automation_rules_v1",
      JSON.stringify([
        {
          id: "rule-auto-1",
          name: "Auto Appointment Rule",
          enabled: true,
          entityType: "appointment",
          trigger: { event: "appointment.created" },
          actions: [{ stepKey: "book_appointment" }],
        },
      ])
    );
  });

  it("should sync room number, room name, and directions from location-wise availability rules", () => {
    const rules = [
      {
        id: "rule-1",
        locationId: "loc-1",
        seats: 2,
        assignedUserIds: [101],
        roomNumber: "204B",
        roomName: "Consultation Suite B",
        direction: "Take elevator to 2nd floor, turn right past lab.",
      },
      {
        id: "rule-2",
        locationId: "loc-2",
        seats: 1,
        assignedUserIds: [102],
        roomNumber: "101",
        roomName: "Dental Station 1",
        direction: "Ground floor, immediately left of reception desk.",
      },
    ];

    const teamMembers = [
      { id: 101, name: "Dr. Sarah Smith", role: "Cardiologist", initials: "SS" },
      { id: 102, name: "Dr. Alex Johnson", role: "Dentist", initials: "AJ" },
    ];

    const locations = [
      { id: "loc-1", name: "Downtown Clinic" },
      { id: "loc-2", name: "Westside Branch" },
    ];

    syncServiceRooms(42, "Comprehensive Health Check", rules, teamMembers, locations);

    // Check localStorage persistence
    const stored = getStoredRooms();
    const serviceRooms = stored.filter((r) => r.serviceId === "42");
    expect(serviceRooms).toHaveLength(2);

    expect(serviceRooms[0].roomNumber).toBe("204B");
    expect(serviceRooms[0].name).toBe("Consultation Suite B");
    expect(serviceRooms[0].direction).toBe("Take elevator to 2nd floor, turn right past lab.");
    expect(serviceRooms[0].location).toBe("Downtown Clinic");
    expect(serviceRooms[0].responsibleName).toBe("Dr. Sarah Smith");

    expect(serviceRooms[1].roomNumber).toBe("101");
    expect(serviceRooms[1].name).toBe("Dental Station 1");
    expect(serviceRooms[1].direction).toBe("Ground floor, immediately left of reception desk.");
    expect(serviceRooms[1].location).toBe("Westside Branch");

    // Verify findRoomForAppointment allocates the matching room
    const allocated = findRoomForAppointment({
      serviceId: 42,
      location: "Downtown Clinic",
      employeeId: 101,
    });
    expect(allocated).toBeDefined();
    expect(allocated?.roomNumber).toBe("204B");
    expect(allocated?.name).toBe("Consultation Suite B");
  });

  it("should mark appointment as no show and update stage", () => {
    const result = appointmentService.createAppointment({
      clientName: "John Doe",
      clientEmail: "john@example.com",
      clientPhone: "+15551234567",
      employeeId: 101,
      serviceId: 1,
      date: "2026-10-24",
      time: "10:00 AM",
      location: "Downtown Clinic",
    });

    const appt = result.appointment;
    expect(appt).toBeDefined();
    expect(appt.currentStageId).not.toBe("appt-7");

    const updated = appointmentService.markNoShow(appt.id, "Client did not arrive after 30 minutes");
    expect(updated).not.toBeNull();
    expect(updated?.currentStageId).toBe("appt-7");
    expect(updated?.status).toBe("no-show");
    expect(updated?.statusLabel).toBe("No-show");

    const refreshed = appointmentService.getAppointmentById(appt.id);
    expect(refreshed?.status).toBe("no-show");
    expect(refreshed?.currentStageId).toBe("appt-7");
  });
});
