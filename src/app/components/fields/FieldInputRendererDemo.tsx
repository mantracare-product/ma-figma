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

      {/* ── Test 2: group (Address Block) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          2. Recursive Group Field: Same Sub-Field Tree Across Modes
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

      {/* ── Test 3: Real Legacy Column Normalization Output ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          3. Real Existing Table Column Data Normalization Verification
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
