// Polyfill localStorage, sessionStorage, and window for Node environment
const store: Record<string, string> = {};
const sessionStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

const mockSessionStorage = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, val: string) => { sessionStore[key] = val; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); },
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).window = {
  dispatchEvent: (event: any) => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class {
  type: string;
  detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

import { describe, it, expect, beforeEach } from "vitest";
import { eventBus } from "../lib/eventBus";
import { getStoredClients, saveStoredClients, moveClientToStage } from "../lib/clientsStore";
import {
  saveStoredRules,
  getStoredRules,
  DEFAULT_CHECKIN_CARE_JOURNEY_RULE,
  AutomationRule,
} from "../lib/useAutomationStore";
import { executeRulesForEvent } from "../lib/ruleEngine";
import { GLOBAL_TRIGGER_CATALOG } from "../app/types/automation";

describe("Checked In Automation Flow", () => {
  beforeEach(() => {
    // Reset stored clients
    const clients = getStoredClients();
    const resetClients = clients.map((c) =>
      c.id === "CL-001"
        ? { ...c, stage: "Initial Inquiry", processes: ["Patient Care Journey"] }
        : c
    );
    saveStoredClients(resetClients);
  });

  it("has 'Checked in' trigger in GLOBAL_TRIGGER_CATALOG under client", () => {
    const clientCatalog = GLOBAL_TRIGGER_CATALOG.find((c) => c.type === "client");
    expect(clientCatalog).toBeDefined();
    const checkedInTrigger = clientCatalog?.events.find(
      (e) => e.event === "client.checked_in"
    );
    expect(checkedInTrigger).toBeDefined();
    expect(checkedInTrigger?.label).toBe("Checked in");
  });

  it("moves client to configured stage when client.checked_in event is emitted", async () => {
    // Configure rule: Checked in -> Patient Care Journey -> "Book Appointment"
    const customRule: AutomationRule = {
      ...DEFAULT_CHECKIN_CARE_JOURNEY_RULE,
      id: "rule-test-checkin-move",
      trigger: {
        event: "client.checked_in",
        label: "Checked in",
      },
      actions: [
        {
          id: "step-1",
          name: "Update to stage",
          description: "Update stage to Book Appointment",
          iconKey: "GitBranch",
          stepKey: "update_to_stage",
          trigger: "client.checked_in",
          executionType: "wait",
          params: {
            stageEntity: "processes",
            entityType: "processes",
            processId: "demo-patient-care-journey",
            processName: "Patient Care Journey",
            stageId: "stage-book-appointment",
            stageName: "Book Appointment",
          },
        },
      ],
      enabled: true,
    };

    saveStoredRules([customRule]);

    // Emit event
    const event = await eventBus.emit("client.checked_in", "client", "CL-001", {
      clientId: "CL-001",
      clientName: "John Doe",
    });

    // Execute rule engine for event
    await executeRulesForEvent(event);

    // Verify client stage was updated to configured stage ("Book Appointment")
    const freshClients = getStoredClients();
    const updated = freshClients.find((c) => c.id === "CL-001");
    expect(updated?.stage).toBe("Book Appointment");
    expect(updated?.processes).toContain("Patient Care Journey");
  });

  it("moveClientToStage correctly updates client stage and process enrollment", () => {
    const updated = moveClientToStage("CL-001", "Move to Pharmacy", "Patient Care Journey");
    expect(updated).toBeDefined();
    expect(updated?.stage).toBe("Move to Pharmacy");
    expect(updated?.processes).toContain("Patient Care Journey");

    const inStore = getStoredClients().find((c) => c.id === "CL-001");
    expect(inStore?.stage).toBe("Move to Pharmacy");
  });
});
