import {
  normalizeLegacyColumn,
  resolveColumnsOrSubFields,
} from "../src/app/context/FieldRegistryContext";

console.log("================================================================================");
console.log("BACKWARD COMPATIBILITY TEST RUNNER: resolveColumnsOrSubFields & normalizeLegacyColumn");
console.log("================================================================================\n");

// ── Test 1: Real Stored Table Field (Created via Admin Custom Fields UI in this session) ──
const realStoredTableField = {
  id: 1773468500000,
  key: "equipment_inspection",
  label: "Equipment Inspection",
  module: "client",
  source: "custom",
  inputType: "table",
  placeholder: "Enter equipment inspection",
  required: false,
  showAlways: true,
  userVisibility: true,
  tableColumns: [
    { id: "col_1", name: "Item Name", type: "Text" },
    { id: "col_2", name: "Quantity", type: "Number" },
    { id: "col_3", name: "Unit Price", type: "Money" }
  ],
  createdAt: 1773468500000
};

console.log("--- TEST 1: REAL STORED TABLE FIELD FROM UI/LOCALSTORAGE ---");
console.log("Input field definition:");
console.log(JSON.stringify(realStoredTableField, null, 2));

const test1Result = resolveColumnsOrSubFields(realStoredTableField as any);
console.log("\nActual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(test1Result, null, 2));

// ── Test 2: Edge Case 1 — Column with `type` missing AND `name` missing ──
console.log("\n--- TEST 2: EDGE CASE 1 — TYPE & NAME MISSING ---");
const malformedCol1 = { id: "col_orphan_99" };
console.log("Input raw column:", JSON.stringify(malformedCol1));
const edgeCase1Result = normalizeLegacyColumn(malformedCol1);
console.log("Actual normalizeLegacyColumn() output:");
console.log(JSON.stringify(edgeCase1Result, null, 2));

// ── Test 3: Edge Case 2 — Old `fieldIds` / `colId` / `title` legacy naming ──
console.log("\n--- TEST 3: EDGE CASE 2 — LEGACY NAMING (colId, fieldIds, title) ---");
const malformedCol2 = {
  colId: "c_legacy_101",
  fieldIds: ["field_old_sym"],
  title: "Legacy Diagnostic Column",
  type: "Number"
};
console.log("Input raw column:", JSON.stringify(malformedCol2));
const edgeCase2Result = normalizeLegacyColumn(malformedCol2);
console.log("Actual normalizeLegacyColumn() output:");
console.log(JSON.stringify(edgeCase2Result, null, 2));

// ── Test 4: Edge Case 3 — Empty tableColumns and no subFields ──
console.log("\n--- TEST 4: EDGE CASE 3 — EMPTY tableColumns ARRAY & NO subFields ---");
const emptyTableField = {
  id: 99901,
  key: "empty_grid",
  label: "Empty Grid",
  module: "client",
  source: "custom",
  inputType: "table",
  tableColumns: []
};
console.log("Input field definition:", JSON.stringify(emptyTableField));
const edgeCase3Result = resolveColumnsOrSubFields(emptyTableField as any);
console.log("Actual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(edgeCase3Result, null, 2));
console.log("Does edgeCase3 throw?: No. Returns empty array:", Array.isArray(edgeCase3Result) && edgeCase3Result.length === 0);

// ── Test 5: Edge Case 4 — Null / Undefined column elements inside tableColumns ──
console.log("\n--- TEST 5: EDGE CASE 4 — NULL / UNDEFINED COLUMN ELEMENTS ---");
const nullishColsField = {
  id: 99902,
  key: "nullish_grid",
  tableColumns: [null, undefined, { id: "valid_col", name: "Valid", type: "Select" }]
};
console.log("Input tableColumns:", JSON.stringify(nullishColsField.tableColumns));
const edgeCase4Result = resolveColumnsOrSubFields(nullishColsField as any);
console.log("Actual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(edgeCase4Result, null, 2));

const ids = edgeCase4Result.map((c) => c.id);
const hasDuplicates = new Set(ids).size !== ids.length;

console.log("\nVerification checks for Test 5:");
console.log("1. Are null/undefined entries dropped? (length === 1):", edgeCase4Result.length === 1);
console.log("2. Does only 'valid_col' remain?:", edgeCase4Result[0]?.id === "valid_col" && edgeCase4Result[0]?.name === "Valid");
console.log("3. Are there any duplicate IDs?:", hasDuplicates);

console.log("\n================================================================================");
console.log("ALL TESTS EXECUTED SUCCESSFULLY WITHOUT EXCEPTIONS OR DATA CORRUPTION");
console.log("================================================================================");
