/**
 * multiTabConcurrency.test.ts
 * Path: src/reception/__tests__/multiTabConcurrency.test.ts
 *
 * Simulates multi-tab interaction between Kiosk, Staff Console, and TV Display Board:
 * 1. Cross-tab event bus dispatching
 * 2. Atomic mutex lock concurrency test (preventing race condition on simultaneous ticket calls)
 * 3. Multi-station visit journey progression (Checkin -> Doctor -> Pharmacy -> Done)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockMaClient } from "../lib/api/mockMaClient";
import { LockService } from "../lib/sync/lockService";
import { EventBusService } from "../lib/sync/eventBusService";
import type { DisplayEvent, QueueEvent } from "../types/reception";

describe("Phase 2 - Multi-Surface Concurrency & Synchronization", () => {
  let kioskClient: MockMaClient;
  let consoleClientA: MockMaClient;
  let consoleClientB: MockMaClient;
  let displayClient: MockMaClient;

  beforeEach(() => {
    MockMaClient.resetStorage();
    // Simulate four independent tabs/clients
    kioskClient = new MockMaClient();
    consoleClientA = new MockMaClient();
    consoleClientB = new MockMaClient();
    displayClient = new MockMaClient();
  });

  it("should synchronize check-ins from Kiosk to Display board in real time", async () => {
    const receivedDisplayEvents: DisplayEvent[] = [];

    // Display board tab subscribes
    const unsubscribe = displayClient.subscribeToDisplay("default", (event) => {
      receivedDisplayEvents.push(event);
    });

    // Kiosk checks in a new walk-in patient
    const checkinRes = await kioskClient.checkinWalkIn({
      patient: { name: "Multi-Tab Tester", phone: "+1 555-777-8888" },
      reason: "Cardiology",
    });

    expect(checkinRes.success).toBe(true);
    expect(checkinRes.ticket).toBeDefined();

    // Staff Console calls next ticket at assigned station
    const called = await consoleClientA.callNextTicket(checkinRes.ticket.stationId);
    expect(called).not.toBeNull();

    // Display board should have received real-time broadcast
    expect(receivedDisplayEvents.length).toBeGreaterThan(0);
    const lastEvent = receivedDisplayEvents[receivedDisplayEvents.length - 1];
    expect(lastEvent.nowServing.length).toBeGreaterThanOrEqual(1);

    unsubscribe();
  });

  it("should prevent double-call race conditions when two console tabs call simultaneously", async () => {
    // Check in 2 walk-in patients
    const p1 = await kioskClient.checkinWalkIn({
      patient: { name: "Patient One", phone: "+1 555-111-2222" },
      reason: "Consultation",
    });
    const p2 = await kioskClient.checkinWalkIn({
      patient: { name: "Patient Two", phone: "+1 555-333-4444" },
      reason: "Consultation",
    });

    const stationId = p1.ticket.stationId;

    // Console A and Console B fire callNextTicket at the exact same millisecond
    const [callA, callB] = await Promise.all([
      consoleClientA.callNextTicket(stationId),
      consoleClientB.callNextTicket(stationId),
    ]);

    // Both calls must succeed, but must NEVER receive the same ticket ID
    expect(callA).not.toBeNull();
    expect(callB).not.toBeNull();
    expect(callA?.id).not.toBe(callB?.id);
    expect(callA?.tokenLabel).not.toBe(callB?.tokenLabel);
  });

  it("should route patient across multi-station journey (Doctor -> Pharmacy -> Checkout)", async () => {
    // 1. Kiosk Check-in
    const walkin = await kioskClient.checkinWalkIn({
      patient: { name: "Full Journey Patient", phone: "+1 555-987-6543" },
      reason: "Health Check",
    });

    const ticket1 = walkin.ticket;

    // 2. Doctor Station calls and serves ticket
    const calledDoc = await consoleClientA.callTicket(ticket1.id, "st-consult-1");
    expect(calledDoc.status).toBe("called");

    await consoleClientA.serveTicket(ticket1.id);

    // 3. Doctor completes stage and routes to Pharmacy
    const { journey, nextTickets } = await consoleClientA.completeTicket(
      ticket1.id,
      ["stg_def_3"], // Pharmacy stage
      "idem-journey-stage-3"
    );

    expect(journey.status).toBe("active");
    expect(nextTickets.length).toBe(1);
    expect(nextTickets[0].stationId).toBe("station_pharmacy_1");

    // 4. Pharmacy station calls next ticket
    const pharmacyTicket = await consoleClientB.callNextTicket("station_pharmacy_1");
    expect(pharmacyTicket).not.toBeNull();
    expect(pharmacyTicket?.tokenLabel).toBe(ticket1.tokenLabel); // Retains consistent token across stages

    // 5. Pharmacy completes final stage
    const finalRes = await consoleClientB.completeTicket(pharmacyTicket!.id, []);
    expect(finalRes.journey.status).toBe("completed");
  });
});
