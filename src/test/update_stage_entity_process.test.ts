import { describe, it } from "node:test";
import assert from "node:assert";
import {
  Process,
  isProcessMatchingScopingRules,
  DEFAULT_ENTITY_PROCESSES,
} from "../lib/useProcessStore";

describe("Update to Stage - Entity Process & Scope Rule Selection", () => {
  const mockProcesses: Process[] = [
    {
      id: "proc-appt-1",
      name: "General Appointment Flow",
      description: "Standard clinic appointment workflow",
      assignedToUserId: 1,
      entityType: "appointment",
      aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
      industryCategory: "Healthcare",
      industry: "General Practice",
      locations: ["All"],
      stages: [
        { id: "stg-gen-1", name: "Scheduled", description: "", status: "active" },
        { id: "stg-gen-2", name: "Confirmed", description: "", status: "active" },
        { id: "stg-gen-3", name: "Completed", description: "", status: "active" },
      ],
    },
    {
      id: "proc-appt-2",
      name: "Cataract Surgery Flow",
      description: "Specialized ophthalmology cataract surgery workflow",
      assignedToUserId: 1,
      entityType: "appointment",
      aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
      industryCategory: "Healthcare",
      industry: "Ophthalmology",
      locations: ["New York"],
      stages: [
        { id: "stg-cat-1", name: "Pre-Op Assessment", description: "", status: "active" },
        { id: "stg-cat-2", name: "Surgery Booked", description: "", status: "active" },
        { id: "stg-cat-3", name: "Post-Op Follow-up", description: "", status: "active" },
      ],
    },
    {
      id: "proc-appt-auto",
      name: "Automotive Service Flow",
      description: "Vehicle maintenance scheduling",
      assignedToUserId: 1,
      entityType: "appointment",
      aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
      industryCategory: "Automobile",
      industry: "Auto Repair",
      locations: ["All"],
      stages: [
        { id: "stg-auto-1", name: "Drop-off Booked", description: "", status: "active" },
        { id: "stg-auto-2", name: "Service In Progress", description: "", status: "active" },
      ],
    },
    {
      id: "proc-client-1",
      name: "Patient Intake Flow",
      description: "Client registration",
      assignedToUserId: 1,
      entityType: "client",
      aiSettings: { platform: "OpenAI", voiceSpeed: 1.0 },
      industryCategory: "Healthcare",
      stages: [
        { id: "stg-cli-1", name: "Inquiry", description: "", status: "active" },
        { id: "stg-cli-2", name: "Onboarded", description: "", status: "active" },
      ],
    },
  ];

  it("filters appointment processes based on Healthcare scoping rules", () => {
    const healthcareScope = [{ industryCategory: "Healthcare", industries: ["All"], locations: ["All"] }];
    const scopedProcs = mockProcesses.filter((p) => isProcessMatchingScopingRules(p, healthcareScope));
    const appointmentProcs = scopedProcs.filter((p) => p.entityType === "appointment");

    assert.strictEqual(appointmentProcs.length, 2);
    assert.ok(appointmentProcs.some((p) => p.name === "General Appointment Flow"));
    assert.ok(appointmentProcs.some((p) => p.name === "Cataract Surgery Flow"));
    assert.ok(!appointmentProcs.some((p) => p.name === "Automotive Service Flow"));
  });

  it("filters appointment processes strictly for Ophthalmology / New York scope", () => {
    const ophthalmologyScope = [{ industryCategory: "Healthcare", industries: ["Ophthalmology"], locations: ["New York"] }];
    const scopedProcs = mockProcesses.filter((p) => isProcessMatchingScopingRules(p, ophthalmologyScope));
    const appointmentProcs = scopedProcs.filter((p) => p.entityType === "appointment");

    assert.strictEqual(appointmentProcs.length, 1);
    assert.strictEqual(appointmentProcs[0].id, "proc-appt-2");
    assert.strictEqual(appointmentProcs[0].stages.length, 3);
    assert.strictEqual(appointmentProcs[0].stages[0].name, "Pre-Op Assessment");
  });

  it("renders distinct stages depending on selected appointment process", () => {
    const cataractProc = mockProcesses.find((p) => p.id === "proc-appt-2");
    const generalProc = mockProcesses.find((p) => p.id === "proc-appt-1");

    assert.deepStrictEqual(
      cataractProc?.stages.map((s) => s.name),
      ["Pre-Op Assessment", "Surgery Booked", "Post-Op Follow-up"]
    );

    assert.deepStrictEqual(
      generalProc?.stages.map((s) => s.name),
      ["Scheduled", "Confirmed", "Completed"]
    );
  });
});
