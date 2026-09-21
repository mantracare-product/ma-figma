/**
 * walkinBooking.test.ts
 * Path: src/reception/__tests__/walkinBooking.test.ts
 *
 * Unit tests for Single-Screen AI Receptionist Flow B (Walk-in Patient Registration & Booking).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockMaClient } from "../lib/api/mockMaClient";

describe("Phase 2: Flow B - Walk-in Patient Registration & Booking", () => {
  let client: MockMaClient;

  beforeEach(() => {
    MockMaClient.resetStorage();
    client = new MockMaClient();
  });

  it("should create a new walk-in client profile in synthetic storage", async () => {
    const payload = {
      name: "Marcus Aurelius",
      phone: "+1 (555) 777-8899",
      age: 42,
      gender: "Male",
      reason: "General Consultation",
    };

    const newPatient = await client.createWalkInClient(payload);
    expect(newPatient).toBeDefined();
    expect(newPatient.id).toMatch(/^pat_/);
    expect(newPatient.name).toBe("Marcus Aurelius");
    expect(newPatient.phone).toBe("+1 (555) 777-8899");

    const lookup = await client.lookupClientsByPhone("+1 (555) 777-8899");
    expect(lookup.length).toBe(1);
    expect(lookup[0].name).toBe("Marcus Aurelius");
  });

  it("should fetch active clinic services and doctors for walk-ins", async () => {
    const services = await client.getServices();
    expect(services.length).toBeGreaterThanOrEqual(3);
    const generalPhysician = services.find((s) => s.id === "srv_consult");
    expect(generalPhysician).toBeDefined();

    const providers = await client.getProviders();
    expect(providers.length).toBeGreaterThanOrEqual(3);
    const drSharma = providers.find((p) => p.name === "Dr. Ananya Sharma");
    expect(drSharma).toBeDefined();
  });

  it("should check in walk-in patient and issue queue token D-001", async () => {
    const walkinPayload = {
      patient: {
        name: "Marcus Aurelius",
        phone: "+1 (555) 777-8899",
      },
      reason: "Fever and headache",
    };

    const result = await client.checkinWalkIn(walkinPayload);
    expect(result.success).toBe(true);
    expect(result.ticket).toBeDefined();
    expect(result.ticket.tokenLabel).toMatch(/^D-\d+/);
    expect(result.ticket.status).toBe("waiting");
    expect(result.ticket.estimatedWaitMin).toBeGreaterThanOrEqual(5);

    expect(result.journey).toBeDefined();
    expect(result.journey.status).toBe("active");
  });

  it("should ensure walk-in check-in is idempotent with unique key", async () => {
    const key = `walkin_test_key_${Date.now()}`;
    const walkinPayload = {
      patient: {
        name: "Marcus Aurelius",
        phone: "+1 (555) 777-8899",
      },
      reason: "General checkup",
      idempotencyKey: key,
    };

    const res1 = await client.checkinWalkIn(walkinPayload);
    const res2 = await client.checkinWalkIn(walkinPayload);

    expect(res1.ticket.id).toBe(res2.ticket.id);
    expect(res1.ticket.tokenLabel).toBe(res2.ticket.tokenLabel);
  });
});
