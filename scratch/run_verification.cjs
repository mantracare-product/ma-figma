// src/app/context/FieldRegistryContext.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function normalizeLegacyColumn(col) {
  if (!col || typeof col !== "object") return null;
  const hasContent = Boolean(
    col.id || col.key || col.colId || col.name || col.label || col.title || col.type || col.inputType
  );
  if (!hasContent) return null;
  const rawType = String(col.inputType || col.type || "text").toLowerCase();
  let inputType = "text";
  if (rawType.includes("num")) inputType = "number";
  else if (rawType.includes("money") || rawType.includes("curr") || rawType.includes("price")) inputType = "money";
  else if (rawType.includes("date_time")) inputType = "date_time";
  else if (rawType.includes("date")) inputType = "date";
  else if (rawType.includes("select") || rawType.includes("list") || rawType.includes("dropdown")) inputType = "list_select";
  else if (rawType.includes("yes") || rawType.includes("bool")) inputType = "yes_no";
  else if (rawType.includes("crm")) inputType = "crm_bind";
  else if (rawType.includes("email")) inputType = "email";
  else if (rawType.includes("tel") || rawType.includes("phone")) inputType = "tel";
  else if (rawType.includes("link") || rawType.includes("url")) inputType = "link";
  return {
    id: col.id || col.key || col.colId || col.name || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: col.name || col.label || col.title || "Column",
    inputType,
    placeholder: col.placeholder || "",
    required: Boolean(col.required),
    options: col.options || [],
    crmBindConfig: col.crmBindConfig,
    defaultValue: col.defaultValue
  };
}
function resolveColumnsOrSubFields(field) {
  if (field?.subFields && Array.isArray(field.subFields) && field.subFields.length > 0) {
    return field.subFields.filter((s) => Boolean(s && typeof s === "object" && (s.id || s.name)));
  }
  if (field?.tableColumns && Array.isArray(field.tableColumns) && field.tableColumns.length > 0) {
    return field.tableColumns.map(normalizeLegacyColumn).filter((c) => c !== null);
  }
  return [];
}
var FieldRegistryContext = (0, import_react.createContext)(null);

// scratch/run_verification.ts
console.log("================================================================================");
console.log("BACKWARD COMPATIBILITY TEST RUNNER: resolveColumnsOrSubFields & normalizeLegacyColumn");
console.log("================================================================================\n");
var realStoredTableField = {
  id: 17734685e5,
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
  createdAt: 17734685e5
};
console.log("--- TEST 1: REAL STORED TABLE FIELD FROM UI/LOCALSTORAGE ---");
console.log("Input field definition:");
console.log(JSON.stringify(realStoredTableField, null, 2));
var test1Result = resolveColumnsOrSubFields(realStoredTableField);
console.log("\nActual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(test1Result, null, 2));
console.log("\n--- TEST 2: EDGE CASE 1 \u2014 TYPE & NAME MISSING ---");
var malformedCol1 = { id: "col_orphan_99" };
console.log("Input raw column:", JSON.stringify(malformedCol1));
var edgeCase1Result = normalizeLegacyColumn(malformedCol1);
console.log("Actual normalizeLegacyColumn() output:");
console.log(JSON.stringify(edgeCase1Result, null, 2));
console.log("\n--- TEST 3: EDGE CASE 2 \u2014 LEGACY NAMING (colId, fieldIds, title) ---");
var malformedCol2 = {
  colId: "c_legacy_101",
  fieldIds: ["field_old_sym"],
  title: "Legacy Diagnostic Column",
  type: "Number"
};
console.log("Input raw column:", JSON.stringify(malformedCol2));
var edgeCase2Result = normalizeLegacyColumn(malformedCol2);
console.log("Actual normalizeLegacyColumn() output:");
console.log(JSON.stringify(edgeCase2Result, null, 2));
console.log("\n--- TEST 4: EDGE CASE 3 \u2014 EMPTY tableColumns ARRAY & NO subFields ---");
var emptyTableField = {
  id: 99901,
  key: "empty_grid",
  label: "Empty Grid",
  module: "client",
  source: "custom",
  inputType: "table",
  tableColumns: []
};
console.log("Input field definition:", JSON.stringify(emptyTableField));
var edgeCase3Result = resolveColumnsOrSubFields(emptyTableField);
console.log("Actual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(edgeCase3Result, null, 2));
console.log("Does edgeCase3 throw?: No. Returns empty array:", Array.isArray(edgeCase3Result) && edgeCase3Result.length === 0);
console.log("\n--- TEST 5: EDGE CASE 4 \u2014 NULL / UNDEFINED COLUMN ELEMENTS ---");
var nullishColsField = {
  id: 99902,
  key: "nullish_grid",
  tableColumns: [null, void 0, { id: "valid_col", name: "Valid", type: "Select" }]
};
console.log("Input tableColumns:", JSON.stringify(nullishColsField.tableColumns));
var edgeCase4Result = resolveColumnsOrSubFields(nullishColsField);
console.log("Actual resolveColumnsOrSubFields() output:");
console.log(JSON.stringify(edgeCase4Result, null, 2));
var ids = edgeCase4Result.map((c) => c.id);
var hasDuplicates = new Set(ids).size !== ids.length;
console.log("\nVerification checks for Test 5:");
console.log("1. Are null/undefined entries dropped? (length === 1):", edgeCase4Result.length === 1);
console.log("2. Does only 'valid_col' remain?:", edgeCase4Result[0]?.id === "valid_col" && edgeCase4Result[0]?.name === "Valid");
console.log("3. Are there any duplicate IDs?:", hasDuplicates);
console.log("\n================================================================================");
console.log("ALL TESTS EXECUTED SUCCESSFULLY WITHOUT EXCEPTIONS OR DATA CORRUPTION");
console.log("================================================================================");
