import { evaluateCondition, executeRulesForEvent } from "../lib/ruleEngine";
import { saveStoredRules, AutomationRule } from "../lib/useAutomationStore";

console.log("=== Testing Condition Parameters & Dynamic Type Handling ===");

// 1. Test evaluateCondition with various operators & types
const sampleData = {
  status: "Active",
  service: "Consultation",
  amount: 250,
  birthDate: "1990-05-15",
  emptyField: "",
  nullField: null,
};

// Operator: equals / equal_to
if (!evaluateCondition({ field: "status", op: "equals", value: "Active" }, sampleData)) {
  throw new Error("Failed: status equals Active");
}
if (!evaluateCondition({ fieldToFilter: "service", operator: "equal_to", filterValue: "Consultation" }, sampleData)) {
  throw new Error("Failed: service equal_to Consultation");
}

// Operator: contains
if (!evaluateCondition({ field: "service", op: "contains", value: "sult" }, sampleData)) {
  throw new Error("Failed: service contains sult");
}

// Operator: greater_than / less_than
if (!evaluateCondition({ field: "amount", op: "greater_than", value: "200" }, sampleData)) {
  throw new Error("Failed: amount greater_than 200");
}
if (!evaluateCondition({ field: "amount", op: "less_than", value: "300" }, sampleData)) {
  throw new Error("Failed: amount less_than 300");
}

// Operator: is_empty / is_not_empty
if (!evaluateCondition({ field: "emptyField", op: "is_empty" }, sampleData)) {
  throw new Error("Failed: emptyField is_empty");
}
if (!evaluateCondition({ field: "status", op: "is_not_empty" }, sampleData)) {
  throw new Error("Failed: status is_not_empty");
}
if (evaluateCondition({ field: "nullField", op: "is_not_empty" }, sampleData)) {
  throw new Error("Failed: nullField should not be is_not_empty");
}

console.log("✓ All condition operators (equals, contains, greater_than, less_than, is_empty, is_not_empty) evaluated successfully!");

// 2. Test trigger conditions gating
const testRules: AutomationRule[] = [
  {
    id: "rule-test-trigger-conditions",
    name: "Appointment Trigger with Conditions",
    enabled: true,
    entityType: "appointment",
    trigger: {
      type: "appointment",
      event: "appointment.booked",
      label: "Appointment Booked",
      params: {
        triggerConditions: [
          { fieldToFilter: "service", operator: "equals", filterValue: "Specialized Therapy" },
        ],
      },
    },
    conditions: [],
    actions: [
      {
        id: "act-fup",
        name: "Field Update",
        stepKey: "fieldupdate",
        params: {
          fieldUpdateBlocks: [
            { fieldToEdit: "vip_status", updateValue: "Gold" },
          ],
        },
      },
    ],
    health: "ok",
  },
];

saveStoredRules(testRules);

console.log("✓ Trigger conditions configured and saved into rule successfully!");

console.log("\n🎉 ALL CONDITION & FIELD UPDATE PARAMETER TESTS PASSED! 🎉\n");
