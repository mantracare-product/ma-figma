import { describe, it, expect, beforeEach } from "vitest";
import { MockMaClient } from "../lib/api/mockMaClient";
import { LockService } from "../lib/sync/lockService";
import { EventBusService } from "../lib/sync/eventBusService";
import { QueueEvent, DisplayEvent } from "../types/reception";

describe("Phase 0 - Sync Services", () => {
  describe("LockService", () => {
    it("should execute mutual exclusion locks sequentially", async () => {
      const lockService = new LockService();
      const executionOrder: number[] = [];

      const p1 = lockService.withLock("test-lock", async () => {
        await new Promise((r) => setTimeout(r, 20));
        executionOrder.push(1);
        return "res1";
      });

      const p2 = lockService.withLock("test-lock", async () => {
        executionOrder.push(2);
        return "res2";
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe("res1");
      expect(r2).toBe("res2");
      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe("EventBusService", () => {
    it("should deliver events to same-tab local subscribers", () => {
      const bus = new EventBusService("test-channel");
      const received: QueueEvent[] = [];

      const unsubscribe = bus.subscribe<QueueEvent>("QUEUE_TICKET_CREATED", (payload) => {
        received.push(payload);
      });

      const mockEvent: QueueEvent = {
        type: "QUEUE_TICKET_CREATED",
        payload: {
          ticket: {
            id: "t1",
            ticketNumber: "A001",
            patientId: "p1",
            patientName: "John Doe",
            stationId: "st-1",
            stageId: "checkin",
            status: "waiting",
            priority: 0,
            joinedAt: new Date().toISOString(),
          },
        },
      };

      bus.publish("QUEUE_TICKET_CREATED", mockEvent);
      expect(received.length).toBe(1);
      expect(received[0].payload.ticket.ticketNumber).toBe("A001");

      unsubscribe();
      bus.publish("QUEUE_TICKET_CREATED", mockEvent);
      expect(received.length).toBe(1); // No new events after unsubscribe
    });
  });
});

describe("Phase 0 - IMaClient Contract & MockMaClient Implementation", () => {
  let client: MockMaClient;

  beforeEach(() => {
    MockMaClient.resetStorage();
    client = new MockMaClient();
  });

  it("should list default stations and kiosk devices", async () => {
    const stations = await client.getStations();
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]).toHaveProperty("id");
    expect(stations[0]).toHaveProperty("name");
    expect(stations[0]).toHaveProperty("type");
  });

  it("should register a device and verify its token", async () => {
    const reg = await client.registerDevice({
      name: "Front Kiosk iPad",
      stationId: "st-checkin-1",
    });

    expect(reg.kioskToken).toBeDefined();
    expect(reg.device.name).toBe("Front Kiosk iPad");
    expect(reg.device.status).toBe("active");

    const verification = await client.verifyDevice(reg.kioskToken);
    expect(verification.valid).toBe(true);
    expect(verification.device?.id).toBe(reg.device.id);

    const invalidVer = await client.verifyDevice("invalid-fake-token");
    expect(invalidVer.valid).toBe(false);
  });

  it("should look up patients by normalized phone number", async () => {
    // Seeded phone is +1 (555) 234-5678 or similar
    const result = await client.lookupPatientByPhone("555-234-5678");
    expect(result.found).toBe(true);
    expect(result.patient?.name).toBe("Eleanor Vance");
    expect(result.patient?.phone).toBe("+1 (555) 234-5678");
  });

  it("should perform walk-in check-in with immediate queue entry", async () => {
    const result = await client.checkinWalkIn({
      patient: {
        name: "Jane Smith",
        phone: "+1 555-999-8888",
        dob: "1992-05-12",
      },
      reason: "Urgent Consultation",
      processId: "proc-general-outpatient",
      kioskId: "kiosk-front-1",
    });

    expect(result.success).toBe(true);
    expect(result.ticket).toBeDefined();
    expect(result.ticket.patientName).toBe("Jane Smith");
    expect(result.ticket.status).toBe("waiting");
    expect(result.journey).toBeDefined();
    expect(result.journey.currentStatus).toBe("in_progress");
  });

  it("should enforce idempotency on repeated check-ins with same key", async () => {
    const key = "idem-checkin-test-123";
    const payload = {
      patient: {
        name: "Duplicate Tester",
        phone: "+1 555-000-1111",
      },
      reason: "Routine Check",
      processId: "proc-general-outpatient",
      idempotencyKey: key,
    };

    const res1 = await client.checkinWalkIn(payload);
    const res2 = await client.checkinWalkIn(payload);

    expect(res1.ticket.id).toBe(res2.ticket.id);
    expect(res1.ticket.ticketNumber).toBe(res2.ticket.ticketNumber);

    const tickets = await client.getQueueTickets();
    const matching = tickets.filter((t) => t.id === res1.ticket.id);
    expect(matching.length).toBe(1);
  });

  it("should check in an existing appointment by opaque QR code / appointmentId", async () => {
    const qrResult = await client.checkinByQrCode("apt-101");
    expect(qrResult.success).toBe(true);
    expect(qrResult.appointment.id).toBe("apt-101");
    expect(qrResult.ticket.patientName).toBe("Eleanor Vance");
  });

  it("should advance ticket lifecycle: callTicket, transferTicket, and completeStage", async () => {
    const walkin = await client.checkinWalkIn({
      patient: { name: "Lifecycle User", phone: "+1 555-123-4567" },
      reason: "General Consultation",
      processId: "proc-general-outpatient",
    });

    const ticketId = walkin.ticket.id;
    const journeyId = walkin.journey.id;

    // Call ticket to Station 1
    const calledTicket = await client.callTicket(ticketId, "st-consult-1");
    expect(calledTicket.status).toBe("called");
    expect(calledTicket.stationId).toBe("st-consult-1");

    // Complete stage
    const updatedJourney = await client.completeStage(journeyId, walkin.journey.stages[0].stageId, {
      notes: "Stage completed successfully",
    });
    expect(updatedJourney.id).toBe(journeyId);
  });

  it("should query knowledge base and patient invoices", async () => {
    const kbResults = await client.queryKnowledgeBase("parking");
    expect(kbResults.length).toBeGreaterThan(0);
    expect(kbResults[0].answer).toContain("Validated parking");

    const invoices = await client.getPatientInvoices("pat-1");
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0].amount).toBe(150);
  });

  it("should process mock voice intents", async () => {
    const checkinIntent = await client.processVoiceIntent("I am here for check in");
    expect(checkinIntent.intent).toBe("check_in");

    const queryIntent = await client.processVoiceIntent("Where is the restroom located?");
    expect(queryIntent.intent).toBe("general_query");
  });
});
