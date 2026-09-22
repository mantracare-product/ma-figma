/**
 * mockMaClient.test.ts
 * Path: src/reception/__tests__/mockMaClient.test.ts
 *
 * Tests for IMaClient and MockMaClient single-screen AI Receptionist contract.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockMaClient } from "../lib/api/mockMaClient";

describe("IMaClient Contract & MockMaClient Implementation", () => {
  let client: MockMaClient;

  beforeEach(() => {
    MockMaClient.resetStorage();
    client = new MockMaClient();
  });

  it("should list default clinic stations and rooms", async () => {
    const stations = await client.getStations();
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]).toHaveProperty("id");
    expect(stations[0]).toHaveProperty("name");
    expect(stations[0]).toHaveProperty("type");
  });

  it("should look up patients by normalized phone number", async () => {
    const results = await client.lookupClientsByPhone("555-234-5678");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe("Eleanor Vance");
    expect(results[0].phone).toBe("+1 (555) 234-5678");
  });

  it("should perform walk-in check-in with immediate queue token issuance", async () => {
    const result = await client.checkinWalkIn({
      patient: {
        name: "Jane Smith",
        phone: "+1 555-999-8888",
        dob: "1992-05-12",
      },
      reason: "Urgent Consultation",
    });

    expect(result.success).toBe(true);
    expect(result.ticket).toBeDefined();
    expect(result.ticket.clientName).toBe("Jane Smith");
    expect(result.ticket.status).toBe("waiting");
    expect(result.journey).toBeDefined();
    expect(result.journey.status).toBe("active");
  });

  it("should enforce idempotency on repeated check-ins with same key", async () => {
    const key = "idem-checkin-test-123";
    const payload = {
      patient: {
        name: "Duplicate Tester",
        phone: "+1 555-000-1111",
      },
      reason: "Routine Check",
      idempotencyKey: key,
    };

    const res1 = await client.checkinWalkIn(payload);
    const res2 = await client.checkinWalkIn(payload);

    expect(res1.ticket.id).toBe(res2.ticket.id);
    expect(res1.ticket.tokenLabel).toBe(res2.ticket.tokenLabel);
  });

  it("should complete a ticket and advance journey stages", async () => {
    const walkin = await client.checkinWalkIn({
      patient: { name: "Lifecycle User", phone: "+1 555-123-4567" },
      reason: "General Consultation",
    });

    const ticketId = walkin.ticket.id;
    const result = await client.completeTicket(ticketId, ["station_pharmacy_1"]);

    expect(result).toBeDefined();
    expect(result.journey).toBeDefined();
  });

  it("should support biometric face enrollment and matching", async () => {
    const enrolled = await client.enrollFaceTemplate("pat_1", [0.1, 0.2, 0.3, 0.4, 0.5], true);
    expect(enrolled).toBe(true);

    const matchRes = await client.matchFace([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(matchRes.matched).toBe(true);
    expect(matchRes.client?.id).toBe("pat_1");
  });
});
