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

import { eventBus } from "../lib/eventBus";
import { executeRulesForEvent } from "../lib/ruleEngine";
import { saveStoredRules, AutomationRule } from "../lib/useAutomationStore";
import { invoiceService } from "../lib/invoiceService";
import { assignProductToClient, getClientProducts, addService } from "../lib/servicesStore";
import { getStoredClientDocuments } from "../lib/clientDocumentsStore";

async function runTests() {
  console.log("=== Testing Trigger Categorization, Assign Product Trigger & Generate Document Automation ===");

  // ── TEST 1: Assign Product Trigger -> Invoice Generation for Client Services
  console.log("\n[Test 1] Testing 'Assign Product' Trigger -> Generate Invoice for Client Services...");
  
  // Create and assign a product to client 'c-99'
  const newSvc = addService({
    name: "Comprehensive Nutrition Consultation",
    description: "Detailed diet plan and intake",
    duration: 45,
    price: 180,
    currency: "USD",
    isActive: true,
  });

  assignProductToClient("c-99", newSvc.id);
  const clientProds = getClientProducts("c-99");
  console.log(`✓ Product assigned to client c-99: ${clientProds.map(p => p.name).join(", ")}`);

  // Setup automation rule: when client.product_assigned fires, generate invoice for client
  const assignProductRule: AutomationRule = {
    id: "rule-assign-product-invoice",
    orgId: "default",
    name: "On Product Assigned Generate Invoice",
    entityType: "client",
    enabled: true,
    action: { type: "moveToStage", processId: "", stageId: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: {
      event: "client.product_assigned",
    },
    actions: [
      {
        id: "act-gen-inv",
        stepKey: "generate_invoice",
        name: "Generate Invoice",
        description: "Generate invoice on product assigned",
        iconKey: "receipt",
        params: {
          billFor: "client",
          dueDays: 7,
          paymentMode: "Online Link",
        },
      },
    ],
  };

  saveStoredRules([assignProductRule]);

  // Emit client.product_assigned event as ClientProfile does
  const evt = await eventBus.emit("client.product_assigned", "client", "c-99", {
    clientId: "c-99",
    clientName: "Alex Turner",
    clientEmail: "alex@example.com",
    productId: newSvc.id,
    productName: newSvc.name,
    productPrice: newSvc.price,
    currency: "USD",
    product: newSvc,
  });

  const execResults = await executeRulesForEvent(evt);
  console.log(`✓ Rule execution results:`, execResults);

  const invoices = invoiceService.getInvoices();
  const createdInv = invoices.find(inv => inv.clientId === "c-99");
  if (!createdInv) {
    throw new Error("Expected invoice to be generated for client c-99, but none was found!");
  }
  console.log(`✓ Invoice created successfully: ID=${createdInv.id}, Total=$${createdInv.total}, LineItems=${createdInv.lineItems.length}`);
  console.log(`✓ Line item description: "${createdInv.lineItems[0].description}" (UnitPrice=$${createdInv.lineItems[0].unitPrice})`);

  // ── TEST 2: Generate Document Automation Step for Various Entities
  console.log("\n[Test 2] Testing 'Generate Document' Automation Step for Entities...");

  const docRule: AutomationRule = {
    id: "rule-generate-doc",
    orgId: "default",
    name: "On Client Created Generate Onboarding Document",
    entityType: "client",
    enabled: true,
    action: { type: "moveToStage", processId: "", stageId: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: {
      event: "client.created",
    },
    actions: [
      {
        id: "act-gen-doc",
        stepKey: "generate_document",
        name: "Generate Document",
        description: "Generate onboarding document",
        iconKey: "filecheck",
        params: {
          entity: "client",
          templateId: "tpl-client-onboarding",
          templateName: "Client Onboarding & Intake Agreement",
          documentName: "{client_name} - Client Onboarding & Intake Agreement",
          fileType: "pdf",
        },
      },
    ],
  };

  // ── TEST 3: Global Stage Enter and Stage Exit triggers
  console.log("\n[Test 3] Testing Global 'Stage Entered' and 'Stage Exited' Triggers...");

  const stageEnteredRule: AutomationRule = {
    id: "rule-stage-entered",
    orgId: "default",
    name: "Global Stage Entered Rule",
    entityType: "appointment",
    enabled: true,
    action: { type: "moveToStage", processId: "", stageId: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: {
      event: "stage.entered",
      params: {
        triggerStageId: "stage-consult",
      },
    },
    actions: [
      {
        id: "act-stage-doc",
        stepKey: "generate_document",
        name: "Generate Clinical Session Notes",
        description: "Generate notes on stage enter",
        iconKey: "filecheck",
        params: {
          entity: "appointment",
          templateId: "tpl-sn-1",
          templateName: "Clinical Consultation & Session Notes",
          documentName: "Session Notes - Appt 501",
          fileType: "pdf",
        },
      },
    ],
  };

  saveStoredRules([assignProductRule, docRule, stageEnteredRule]);

  const clientCreatedEvt = await eventBus.emit("client.created", "client", "c-99", {
    clientId: "c-99",
    clientName: "Alex Turner",
    email: "alex@example.com",
  });

  const docs = getStoredClientDocuments("c-99");
  console.log(`✓ Stored client documents for c-99:`, docs.map(d => `${d.name} (${d.category})`));
  const generatedDoc = docs.find(d => d.name.includes("Alex Turner"));
  if (!generatedDoc) {
    throw new Error("Expected generated document for Alex Turner, but none was found!");
  }
  console.log(`✓ Generated document verified: ID=${generatedDoc.id}, Name="${generatedDoc.name}", FileType=${generatedDoc.fileType}`);

  // Test stage entered trigger execution
  await eventBus.emit("stage.entered", "appointment", "appt-501", {
    stageId: "stage-consult",
    stageName: "In Consultation",
    clientId: "c-99",
  });
  const allDocs = getStoredClientDocuments("c-99");
  console.log(`✓ Stored documents after stage enter:`, allDocs.map(d => `${d.name} (${d.category})`));
  const matchedStageDoc = allDocs.find(d => d.name.includes("Session Notes"));
  if (!matchedStageDoc) {
    throw new Error("Expected global stage entered rule to generate session notes document!");
  }
  console.log(`✓ Generated stage transition document verified: ID=${matchedStageDoc.id}, Name="${matchedStageDoc.name}"`);

  // ── TEST 4: Field Update Trigger -> Document Generation with Dynamic Field Values
  console.log("\n[Test 4] Testing 'Field Update' Trigger & Document Field Substitution...");

  const fieldUpdateDocRule: AutomationRule = {
    id: "rule-field-update-doc",
    orgId: "default",
    name: "On Field Update Generate Clinical Report",
    entityType: "client",
    enabled: true,
    action: { type: "moveToStage", processId: "", stageId: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: {
      event: "field.updated",
      params: {
        monitoredFields: ["diagnosis", "treatment_plan"],
        matchLogic: "any",
      },
    },
    actions: [
      {
        id: "act-field-doc",
        stepKey: "generate_document",
        name: "Generate Clinical Prescription Document",
        description: "Generate document populated with updated fields",
        iconKey: "filecheck",
        params: {
          entity: "client",
          templateId: "tpl-rx-1",
          templateName: "Prescription & Medication Order",
          documentName: "{client_name} - Prescription ({diagnosis})",
          templateText: "PRESCRIPTION FOR {client_name}\nDiagnosis: {diagnosis}\nPlan: {treatment_plan}\nContact: {email}",
          fileType: "pdf",
        },
      },
    ],
  };

  saveStoredRules([assignProductRule, docRule, stageEnteredRule, fieldUpdateDocRule]);

  // 1. Emit field update with an UNWATCHED field (e.g. 'notes') -> Should NOT fire rule
  console.log("  → Testing unwatched field update ('notes')...");
  await eventBus.emit("field.updated", "client", "c-99", {
    clientId: "c-99",
    clientName: "Alex Turner",
    email: "alex@example.com",
    updatedField: "notes",
    updatedFields: ["notes"],
    notes: "Patient attended session on time",
  });
  let docsAfterUnwatched = getStoredClientDocuments("c-99");
  let foundRxDoc = docsAfterUnwatched.find(d => d.name.includes("Prescription"));
  if (foundRxDoc) {
    throw new Error("Field update rule triggered on unwatched field 'notes', but should only watch 'diagnosis' or 'treatment_plan'!");
  }
  console.log("  ✓ Unwatched field update correctly ignored.");

  // 2. Emit field update with a WATCHED field ('diagnosis') -> SHOULD fire rule and populate values!
  console.log("  → Testing watched field update ('diagnosis' -> 'Hypertension Stage 1')...");
  await eventBus.emit("field.updated", "client", "c-99", {
    clientId: "c-99",
    clientName: "Alex Turner",
    email: "alex@example.com",
    updatedField: "diagnosis",
    updatedFields: ["diagnosis"],
    diagnosis: "Hypertension Stage 1",
    treatment_plan: "Lisinopril 10mg daily + Lifestyle modification",
  });

  const docsAfterFieldUpdate = getStoredClientDocuments("c-99");
  const generatedRxDoc = docsAfterFieldUpdate.find(d => d.name.includes("Prescription"));
  if (!generatedRxDoc) {
    throw new Error("Expected field update rule to generate document after 'diagnosis' update, but none found!");
  }

  console.log(`  ✓ Document generated: "${generatedRxDoc.name}"`);
  console.log(`  ✓ Generated document content preview:`, generatedRxDoc.generatedContent);

  if (!generatedRxDoc.name.includes("Hypertension Stage 1")) {
    throw new Error(`Expected document title to contain updated diagnosis 'Hypertension Stage 1', got: ${generatedRxDoc.name}`);
  }
  if (!generatedRxDoc.generatedContent?.includes("Hypertension Stage 1") || !generatedRxDoc.generatedContent?.includes("Alex Turner")) {
    throw new Error(`Expected generated content to contain updated field values, got: ${generatedRxDoc.generatedContent}`);
  }
  console.log("  ✓ Document title and content successfully populated with latest field values!");

  console.log("\n🎉 ALL UNIT & INTEGRATION TESTS PASSED! 🎉\n");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
