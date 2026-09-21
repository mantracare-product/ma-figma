/**
 * scheduledCheckin.test.ts
 * Path: src/reception/__tests__/scheduledCheckin.test.ts
 *
 * Unit tests for Single-Screen AI Receptionist Flow A (Scheduled Patient Check-in).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockMaClient } from "../lib/api/mockMaClient";

describe("Phase 1: Flow A - Scheduled Patient Check-in", () => {
  let client: MockMaClient;

  beforeEach(() => {
    MockMaClient.resetStorage();
    client = new MockMaClient();
  });

  it("should send mock OTP and verify with synthetic code 1234", async () => {
    const phone = "+1 (555) 234-5678";
    const sendResult = await client.sendOtp(phone);
    expect(sendResult.success).toBe(true);
    expect(sendResult.expiresAt).toBeDefined();

    const verifyResult = await client.verifyOtp(phone, "1234");
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.sessionToken).toContain("sess_");
  });

  it("should fail OTP verification with incorrect code", async () => {
    const phone = "+1 (555) 234-5678";
    await client.sendOtp(phone);
    await expect(client.verifyOtp(phone, "9999")).rejects.toThrow("Invalid OTP");
  });

  it("should lookup registered patient Eleanor Vance by phone", async () => {
    const phone = "+1 (555) 234-5678";
    const patients = await client.lookupClientsByPhone(phone);
    expect(patients.length).toBeGreaterThanOrEqual(1);
    const eleanor = patients.find((p) => p.name === "Eleanor Vance");
    expect(eleanor).toBeDefined();
    expect(eleanor?.id).toBe("pat_1");
  });

  it("should fetch today's scheduled appointment for Eleanor Vance", async () => {
    const appointments = await client.getTodayAppointments("pat_1");
    expect(appointments.length).toBe(1);
    expect(appointments[0].clientName).toBe("Eleanor Vance");
    expect(appointments[0].serviceName).toBe("General Consultation");
    expect(appointments[0].providerName).toBe("Dr. Ananya Sharma");
  });

  it("should check in appointment and issue queue token D-001", async () => {
    const appointments = await client.getTodayAppointments("pat_1");
    const apt = appointments[0];

    const { journey, ticket } = await client.checkinAppointment(apt.id, "pat_1");
    expect(ticket).toBeDefined();
    expect(ticket.tokenLabel).toMatch(/^D-\d+/);
    expect(ticket.clientName).toBe("Eleanor Vance");
    expect(ticket.status).toBe("waiting");
    expect(journey).toBeDefined();
    expect(journey.clientId).toBe("pat_1");
    expect(journey.source).toBe("scheduled");
  });

  it("should handle check-in idempotency when same key is passed", async () => {
    const appointments = await client.getTodayAppointments("pat_1");
    const apt = appointments[0];
    const key = `checkin_idemp_key_123`;

    const res1 = await client.checkinAppointment(apt.id, "pat_1", undefined, key);
    const res2 = await client.checkinAppointment(apt.id, "pat_1", undefined, key);

    expect(res1.ticket.id).toBe(res2.ticket.id);
    expect(res1.ticket.tokenLabel).toBe(res2.ticket.tokenLabel);
  });
});
