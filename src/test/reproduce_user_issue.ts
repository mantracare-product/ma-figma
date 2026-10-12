// Polyfill window and storage before importing modules
const memStore: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => memStore[key] || null,
  setItem: (key: string, val: string) => { memStore[key] = String(val); },
  removeItem: (key: string) => { delete memStore[key]; },
  clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
};
(global as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  localStorage: mockStorage,
  sessionStorage: mockStorage,
};
(global as any).localStorage = mockStorage;
(global as any).sessionStorage = mockStorage;

import assert from "node:assert/strict";
import { eventBus } from "../lib/eventBus";
import { appointmentService } from "../lib/appointmentService";
import { invoiceService } from "../lib/invoiceService";
import { saveStoredRules, AutomationRule } from "../lib/useAutomationStore";
import { getStoredClientDocuments } from "../lib/clientDocumentsStore";
import { createParallelStep, appendStepToTree, isParallelStep, flattenRuleSteps } from "../lib/automationTree";
import { initializeRuleEngine } from "../lib/ruleEngine";

async function run() {
  initializeRuleEngine();

  // Build the tree as shown in screenshot:
  // Root parallel:
  //   Branch 1: update_to_stage
  //   Branch 2: generate_invoice -> parallel -> Branch 2.1: update_to_stage, Branch 2.2: generate_document

  const rootParallel = createParallelStep("parallel-root", 2, "Parallel Branches");
  // Branch 1:
  const updateStage1 = {
    id: "step-upd-1",
    name: "Update to stage",
    stepKey: "update_to_stage",
    kind: "action",
    params: {
      stageId: "stage-prepped",
      stageName: "Prepped",
    },
  };
  rootParallel.branches![0].steps = [updateStage1 as any];

  // Branch 2:
  const genInvoice = {
    id: "step-gen-inv",
    name: "Generate Invoice",
    stepKey: "generate_invoice",
    kind: "action",
    params: {
      dueDays: 14,
    },
  };

  const nestedParallel = createParallelStep("parallel-nested", 2, "Parallel Branches");
  const updateStage2 = {
    id: "step-upd-2",
    name: "Update to stage",
    stepKey: "update_to_stage",
    kind: "action",
    params: {
      stageId: "stage-confirmed",
      stageName: "Confirmed",
    },
  };
  const genDoc = {
    id: "step-gen-doc",
    name: "Generate Document",
    stepKey: "generate_document",
    kind: "action",
    params: {
      entity: "invoice",
      templateId: "tpl-inv-1",
      templateName: "Tax Invoice & Billing Statement (Invoices)",
      documentName: "{client_name} - Tax Invoice & Billing Statement",
      outputFormat: "pdf",
    },
  };
  nestedParallel.branches![0].steps = [updateStage2 as any];
  nestedParallel.branches![1].steps = [genDoc as any];

  rootParallel.branches![1].steps = [genInvoice as any, nestedParallel as any];

  const stepsTree = [rootParallel];

  console.log("Flattened steps:", flattenRuleSteps(stepsTree).map((s) => ({ id: s.id, stepKey: s.stepKey })));

  const rule: AutomationRule = {
    id: "user-canvas-rule",
    orgId: "default",
    name: "Appointment Booked -> Invoicing & Document Flow",
    entityType: "appointment",
    enabled: true,
    action: { type: "moveToStage", processId: "", stageId: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: {
      event: "appointment.booked",
      label: "Appointment Booked",
    },
    actions: stepsTree as any,
  };

  saveStoredRules([rule]);

  console.log("\nBooking appointment for Kritika Jain...");
  const apptResult = appointmentService.createAppointment({
    clientName: "Kritika Jain",
    clientEmail: "kritika@gmail.com",
    clientPhone: "+1 8595473503",
    clientId: "CL-032",
    employeeId: 1,
    serviceId: 1,
    date: "2026-10-15",
    time: "10:00",
    title: "Consultation",
  });

  console.log("Appointment result:", {
    apptId: apptResult.appointment?.id,
    invoiceId: apptResult.invoiceId,
  });

  // Allow async rule execution
  await new Promise((r) => setTimeout(r, 100));

  const allDocs = getStoredClientDocuments();
  console.log("\nAll stored documents count:", allDocs.length);
  for (const doc of allDocs) {
    console.log("Doc:", {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      entityType: doc.entityType,
      entityId: doc.entityId,
      invoiceId: doc.invoiceId,
      appointmentId: doc.appointmentId,
      clientId: doc.clientId,
    });
  }
}

run().catch((e) => {
  console.error("Error running test:", e);
  process.exit(1);
});
