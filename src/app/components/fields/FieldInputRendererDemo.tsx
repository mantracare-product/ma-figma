import React, { useState } from "react";
import { FieldInputRenderer } from "./FieldInputRenderer";
import type { FieldDefinition, SubFieldConfig } from "../../context/FieldRegistryContext";
import { normalizeLegacyColumn } from "../../context/FieldRegistryContext";

// ── Sample 1: List Select Field Definition ──
export const sampleListSelectField: Partial<FieldDefinition> = {
  id: 101,
  key: "contact_channel",
  label: "Preferred Contact Channel",
  inputType: "list_select",
  selectionMode: "single",
  options: [
    { id: 1, label: "Phone Call", value: "phone" },
    { id: 2, label: "Email", value: "email" },
    { id: 3, label: "WhatsApp Chat", value: "whatsapp" },
  ],
};

// ── Sample 2: Group Field Definition (Address Block) ──
export const sampleGroupField: Partial<FieldDefinition> = {
  id: 102,
  key: "address_block",
  label: "Physical Address",
  inputType: "group",
  subFields: [
    { id: "street", name: "Street Address", inputType: "text", defaultValue: "123 Market St" },
    { id: "city", name: "City", inputType: "text" },
    { id: "zip", name: "Zip Code", inputType: "number", defaultValue: 94105 },
    {
      id: "country_type",
      name: "Region",
      inputType: "list_select",
      options: [
        { id: 1, label: "Domestic", value: "domestic" },
        { id: 2, label: "International", value: "intl" },
      ],
      defaultValue: "domestic",
    },
  ],
};

// ── Sample 3: Real Legacy Table Columns from Codebase / LocalStorage ──
export const realLegacyTableColumns = [
  { id: "col_1", name: "Item Name", type: "Text" },
  { id: "col_2", name: "Quantity", type: "Number" },
  { id: "col_3", name: "Unit Price", type: "Money" },
  { id: "col_4", name: "Effective Date", type: "Date" },
];

// ── Sample 4: New List (Option List Mode with Medicine Block) ──
export const sampleNewListOptionListField: Partial<FieldDefinition> = {
  id: 104,
  key: "prescribed_medication_block",
  label: "Prescribed Medications",
  inputType: "new_list",
  newListConfig: {
    sourceMode: "option_list",
    selectionMode: "single",
    allowSearch: true,
    optionList: {
      sourceCompositeFieldKey: "medicines_catalog",
      columns: [
        { columnId: "med_name", columnName: "Medicine Name", columnType: "text", isPrimary: true, isDisable: false, isEditable: false },
        { columnId: "salt", columnName: "Salt / Composition", columnType: "text", isPrimary: false, isDisable: true, isEditable: false },
        { columnId: "dosage", columnName: "Dosage & Frequency", columnType: "text", isPrimary: false, isDisable: false, isEditable: true },
      ],
    },
  },
};

export function FieldInputRendererDemo() {
  // States for list_select
  const [runtimeListVal, setRuntimeListVal] = useState("whatsapp");
  const [adminDefaultListVal, setAdminDefaultListVal] = useState("email");

  // States for group
  const [runtimeGroupVal, setRuntimeGroupVal] = useState({
    street: "500 Howard St",
    city: "San Francisco",
    zip: 94105,
    country_type: "domestic",
  });
  const [adminDefaultGroupVal, setAdminDefaultGroupVal] = useState({
    street: "Default Main St",
    zip: 10001,
  });

  // State for New List (Option List with local overrides)
  const [runtimeNewListVal, setRuntimeNewListVal] = useState({
    selectedRowId: "med_1",
    primaryValue: "Amoxicillin 500mg",
    overrides: {
      dosage: "1 tablet twice daily with food (overridden for this patient)",
    },
  });
  const [adminDefaultNewListVal, setAdminDefaultNewListVal] = useState<any>(null);

  // Verify normalizeLegacyColumn against real data
  const normalizedCols: SubFieldConfig[] = realLegacyTableColumns.map(normalizeLegacyColumn);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          FieldInputRenderer: Shared Single-Tree Component Test Harness
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Demonstrating identical underlying component tree driven by <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">mode="runtime"</code> vs <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">mode="admin_default"</code>.
        </p>
      </div>

      {/* ── Test 1: list_select ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          1. Selection List (list_select): Same Component Tree Across Modes
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Runtime Mode */}
          <div className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">mode="runtime"</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">End-User Record</span>
            </div>
            <FieldInputRenderer
              field={sampleListSelectField}
              value={runtimeListVal}
              onChange={setRuntimeListVal}
              mode="runtime"
            />
            <div className="text-[11px] text-slate-500 pt-1 font-mono">
              Live Value: <span className="text-blue-600 font-bold">{JSON.stringify(runtimeListVal)}</span>
            </div>
          </div>

          {/* Admin Default Mode */}
          <div className="space-y-2 p-3 bg-blue-50/30 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">mode="admin_default"</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Admin Configurator</span>
            </div>
            <FieldInputRenderer
              field={sampleListSelectField}
              value={adminDefaultListVal}
              onChange={setAdminDefaultListVal}
              mode="admin_default"
            />
            <div className="text-[11px] text-slate-500 pt-1 font-mono">
              Configured Default: <span className="text-blue-600 font-bold">{JSON.stringify(adminDefaultListVal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Test 2: New List (Option List Mode with Medicine Block & Local Overrides) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          2. NEW FIELD TYPE — New List (Option List Mode with Medicine Block & Overrides)
        </h2>
        <p className="text-xs text-slate-500">
          Selecting a primary value auto-populates associated columns. Locked columns stay disabled; editable columns store per-record overrides without mutating source composite.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Runtime Mode */}
          <div className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">mode="runtime" (End-User)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Record Block & Overrides</span>
            </div>
            <FieldInputRenderer
              field={sampleNewListOptionListField}
              value={runtimeNewListVal}
              onChange={setRuntimeNewListVal}
              mode="runtime"
            />
            <div className="text-[11px] text-slate-500 pt-1">
              <span className="font-semibold block text-slate-700">Storage Shape:</span>
              <pre className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto mt-1">
                {JSON.stringify(runtimeNewListVal, null, 2)}
              </pre>
            </div>
          </div>

          {/* Admin Default Mode */}
          <div className="space-y-2 p-3 bg-blue-50/30 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">mode="admin_default" (Admin)</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Pre-seed Default Row</span>
            </div>
            <FieldInputRenderer
              field={sampleNewListOptionListField}
              value={adminDefaultNewListVal}
              onChange={setAdminDefaultNewListVal}
              mode="admin_default"
            />
            <div className="text-[11px] text-slate-500 pt-1">
              <span className="font-semibold block text-blue-800">Configured Default:</span>
              <pre className="text-[10px] text-blue-700 bg-white p-2 rounded border border-blue-200 overflow-x-auto mt-1">
                {JSON.stringify(adminDefaultNewListVal, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* ── Test 3: group (Address Block) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          3. Recursive Group Field: Same Sub-Field Tree Across Modes
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Runtime Mode */}
          <div className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">mode="runtime"</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">End-User Record</span>
            </div>
            <FieldInputRenderer
              field={sampleGroupField}
              value={runtimeGroupVal}
              onChange={setRuntimeGroupVal}
              mode="runtime"
            />
            <pre className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
              {JSON.stringify(runtimeGroupVal, null, 2)}
            </pre>
          </div>

          {/* Admin Default Mode */}
          <div className="space-y-2 p-3 bg-blue-50/30 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">mode="admin_default"</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Admin Configurator</span>
            </div>
            <FieldInputRenderer
              field={sampleGroupField}
              value={adminDefaultGroupVal}
              onChange={setAdminDefaultGroupVal}
              mode="admin_default"
            />
            <pre className="text-[10px] text-blue-700 bg-white p-2 rounded border border-blue-200 overflow-x-auto">
              {JSON.stringify(adminDefaultGroupVal, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* ── Test 4: Real Legacy Column Normalization Output ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          4. Real Existing Table Column Data Normalization Verification
        </h2>
        <p className="text-xs text-slate-500">
          Raw legacy column objects from localStorage / codebase transformed via <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">normalizeLegacyColumn()</code>:
        </p>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {normalizedCols.map((c, i) => (
            <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
              <div className="font-bold text-slate-800">{c.name}</div>
              <div className="text-slate-400 text-[10px]">Legacy input: {JSON.stringify(realLegacyTableColumns[i])}</div>
              <div className="text-emerald-700 font-semibold">&rarr; inputType: "{c.inputType}"</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FieldInputRendererDemo;
