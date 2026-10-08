import { describe, it } from "node:test";
import assert from "node:assert";
import { GLOBAL_TRIGGER_CATALOG } from "../app/types/automation";
import { isFieldMatchingOrg, FieldDefinition } from "../app/context/FieldRegistryContext";

console.log("=== Testing Appointment Completed Trigger & Scoped Field Registry ===");

// 1. Test appointment.completed trigger in catalog
const appointmentCategory = GLOBAL_TRIGGER_CATALOG.find((cat) => cat.type === "appointment");
assert.ok(appointmentCategory, "Appointment trigger category must exist in catalog");

const appointmentCompletedEvent = appointmentCategory.events.find((e) => e.event === "appointment.completed");
assert.ok(appointmentCompletedEvent, "appointment.completed event must exist in appointment trigger events");
assert.strictEqual(appointmentCompletedEvent.event, "appointment.completed");
console.log("✓ appointment.completed trigger confirmed in GLOBAL_TRIGGER_CATALOG");

// 2. Test Admin scope filtering on Field Definitions
const testFields: FieldDefinition[] = [
  {
    id: -1,
    key: "client_name",
    label: "Client Name",
    module: "client",
    inputType: "text",
    source: "system",
    createdAt: Date.now(),
  },
  {
    id: 101,
    key: "dental_chart",
    label: "Dental Chart",
    module: "client",
    inputType: "text",
    source: "custom",
    createdAt: Date.now(),
    scopingRules: [
      {
        industryCategory: "Healthcare",
        industries: ["Dental Clinics"],
        locations: ["New York"],
      },
    ],
  },
  {
    id: 102,
    key: "vin_number",
    label: "VIN Number",
    module: "client",
    inputType: "text",
    source: "custom",
    createdAt: Date.now(),
    scopingRules: [
      {
        industryCategory: "Automobile",
        industries: ["Auto Dealerships"],
        locations: ["California"],
      },
    ],
  },
];

// Test system fields always match regardless of scope
const systemMatchDental = isFieldMatchingOrg(testFields[0], { industryCategory: "Healthcare", industry: "Dental Clinics", location: "New York" });
assert.strictEqual(systemMatchDental, true, "System fields must always match any scope");

// Test Healthcare / Dental scope matches dental_chart and excludes vin_number
const healthcareScope = { industryCategory: "Healthcare", industry: "Dental Clinics", location: "New York" };
assert.strictEqual(isFieldMatchingOrg(testFields[1], healthcareScope), true, "dental_chart must match Healthcare Dental Clinics scope");
assert.strictEqual(isFieldMatchingOrg(testFields[2], healthcareScope), false, "vin_number must NOT match Healthcare Dental Clinics scope");
console.log("✓ Field scoping correctly isolates custom fields by category, industry, and location");

// Test Automobile scope matches vin_number and excludes dental_chart
const autoScope = { industryCategory: "Automobile", industry: "Auto Dealerships", location: "California" };
assert.strictEqual(isFieldMatchingOrg(testFields[1], autoScope), false, "dental_chart must NOT match Automobile scope");
assert.strictEqual(isFieldMatchingOrg(testFields[2], autoScope), true, "vin_number must match Automobile scope");
console.log("✓ Automobile scope correctly resolves only matching fields");

console.log("\n🎉 ALL APPOINTMENT TRIGGER & SCOPED FIELD REGISTRY TESTS PASSED! 🎉\n");
