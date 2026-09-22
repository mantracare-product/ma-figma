/**
 * advanceListStore.ts
 * Path: src/lib/advanceListStore.ts
 *
 * Central store and utilities for Advance List 2 datasets.
 * Supports custom typed columns (String, Number), behavior flags (Primary, Editable, Disable),
 * sample CSV generation, CSV parsing & validation, and reactive store updates.
 */

export type AdvanceColumnType = "string" | "number";

export interface AdvanceListColumn {
  id: string;             // e.g. "col_item_name", "col_price"
  name: string;           // e.g. "Item Name", "Price ($)"
  type: AdvanceColumnType; // "string" | "number"
  isPrimary?: boolean;    // Exactly ONE column must be primary (acts as main label)
  isEditable?: boolean;   // MULTIPLE columns can be marked editable (per-record override)
  isDisable?: boolean;    // MULTIPLE columns can be marked disable (read-only/locked)
}

export interface AdvanceListRow {
  id: string | number;
  label?: string; // Derived from primary column value
  values: Record<string, string | number>; // Map of col.id -> value
  isDefault?: boolean;
}

export interface AdvanceListDefinition {
  id: string;               // e.g. "adv_list_1727000000"
  name: string;             // Display name e.g. "Procedures & Pricing"
  description?: string;     // Optional notes or metadata
  columns: AdvanceListColumn[];
  rows: AdvanceListRow[];
  createdAt?: string;
  updatedAt?: string;
}

export const ADVANCE_LIST_STORE_KEY = "mantra_advance_lists_v1";
export const ADVANCE_LIST_STORE_EVENT = "mantra_advance_lists_updated";

export const DEFAULT_ADVANCE_LISTS: AdvanceListDefinition[] = [
  {
    id: "adv_list_procedures",
    name: "Medical Procedures Catalog",
    description: "Standard clinic procedures with unit rates and duration codes",
    columns: [
      { id: "col_procedure_name", name: "Procedure Name", type: "string", isPrimary: true, isEditable: false, isDisable: false },
      { id: "col_cpt_code", name: "CPT / Billing Code", type: "string", isPrimary: false, isEditable: false, isDisable: true },
      { id: "col_standard_fee", name: "Standard Fee ($)", type: "number", isPrimary: false, isEditable: true, isDisable: false },
      { id: "col_duration_mins", name: "Duration (Minutes)", type: "number", isPrimary: false, isEditable: false, isDisable: false },
    ],
    rows: [
      {
        id: "row_1",
        label: "Comprehensive Consultation",
        isDefault: true,
        values: {
          col_procedure_name: "Comprehensive Consultation",
          col_cpt_code: "99204",
          col_standard_fee: 150,
          col_duration_mins: 45,
        },
      },
      {
        id: "row_2",
        label: "Follow-up Assessment",
        isDefault: false,
        values: {
          col_procedure_name: "Follow-up Assessment",
          col_cpt_code: "99213",
          col_standard_fee: 85,
          col_duration_mins: 20,
        },
      },
      {
        id: "row_3",
        label: "Diagnostic Ultrasound Scan",
        isDefault: false,
        values: {
          col_procedure_name: "Diagnostic Ultrasound Scan",
          col_cpt_code: "76700",
          col_standard_fee: 320,
          col_duration_mins: 30,
        },
      },
      {
        id: "row_4",
        label: "Minor In-Office Procedure",
        isDefault: false,
        values: {
          col_procedure_name: "Minor In-Office Procedure",
          col_cpt_code: "10060",
          col_standard_fee: 210,
          col_duration_mins: 40,
        },
      },
    ],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "adv_list_service_tiers",
    name: "Service Membership Packages",
    description: "Tiered subscription packages with pricing and quota limits",
    columns: [
      { id: "col_tier_name", name: "Tier Name", type: "string", isPrimary: true, isEditable: false, isDisable: false },
      { id: "col_monthly_cost", name: "Monthly Cost ($)", type: "number", isPrimary: false, isEditable: false, isDisable: false },
      { id: "col_included_visits", name: "Included Visits", type: "number", isPrimary: false, isEditable: true, isDisable: false },
      { id: "col_tier_code", name: "Internal SKU", type: "string", isPrimary: false, isEditable: false, isDisable: true },
    ],
    rows: [
      {
        id: "row_tier_1",
        label: "Basic Wellness Plan",
        isDefault: false,
        values: {
          col_tier_name: "Basic Wellness Plan",
          col_monthly_cost: 49,
          col_included_visits: 1,
          col_tier_code: "PLAN-BSC-01",
        },
      },
      {
        id: "row_tier_2",
        label: "Premium Health Plan",
        isDefault: true,
        values: {
          col_tier_name: "Premium Health Plan",
          col_monthly_cost: 99,
          col_included_visits: 3,
          col_tier_code: "PLAN-PRM-02",
        },
      },
      {
        id: "row_tier_3",
        label: "Executive Family Plan",
        isDefault: false,
        values: {
          col_tier_name: "Executive Family Plan",
          col_monthly_cost: 199,
          col_included_visits: 8,
          col_tier_code: "PLAN-EXEC-03",
        },
      },
    ],
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
  },
];

/**
 * Retrieve all Advance Lists from LocalStorage (with fallback to default seed lists)
 */
export function getStoredAdvanceLists(): AdvanceListDefinition[] {
  try {
    const raw = localStorage.getItem(ADVANCE_LIST_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read advance lists from localStorage:", err);
  }
  // Initialize defaults if none exist
  saveAllAdvanceLists(DEFAULT_ADVANCE_LISTS);
  return DEFAULT_ADVANCE_LISTS;
}

/**
 * Save all advance lists into LocalStorage and emit change event
 */
export function saveAllAdvanceLists(lists: AdvanceListDefinition[]): void {
  try {
    localStorage.setItem(ADVANCE_LIST_STORE_KEY, JSON.stringify(lists));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ADVANCE_LIST_STORE_EVENT, { detail: lists }));
    }
  } catch (err) {
    console.error("Failed to save advance lists:", err);
  }
}

/**
 * Upsert a single Advance List definition
 */
export function saveStoredAdvanceList(list: AdvanceListDefinition): AdvanceListDefinition {
  const current = getStoredAdvanceLists();
  const index = current.findIndex((l) => l.id === list.id);
  const updatedList: AdvanceListDefinition = {
    ...list,
    updatedAt: new Date().toISOString(),
    createdAt: list.createdAt || new Date().toISOString(),
  };

  let nextLists: AdvanceListDefinition[];
  if (index >= 0) {
    nextLists = [...current];
    nextLists[index] = updatedList;
  } else {
    nextLists = [updatedList, ...current];
  }

  saveAllAdvanceLists(nextLists);
  return updatedList;
}

/**
 * Delete an Advance List by ID
 */
export function deleteStoredAdvanceList(id: string): void {
  const current = getStoredAdvanceLists();
  const nextLists = current.filter((l) => l.id !== id);
  saveAllAdvanceLists(nextLists);
}

/**
 * Get a single Advance List by ID
 */
export function getStoredAdvanceListById(id?: string): AdvanceListDefinition | undefined {
  if (!id) return undefined;
  const all = getStoredAdvanceLists();
  return all.find((l) => l.id === id);
}

/**
 * Generate sample CSV text matching the defined columns format
 */
export function generateSampleCsvContent(
  columns: AdvanceListColumn[],
  listName: string = "AdvanceList"
): { filename: string; csvContent: string } {
  if (!columns || columns.length === 0) {
    return {
      filename: `${listName.toLowerCase().replace(/[^a-z0-9]/gi, "_")}_template.csv`,
      csvContent: "Column1,Column2\nSample String,100\n",
    };
  }

  // Header row
  const headers = columns.map((c) => `"${(c.name || c.id).replace(/"/g, '""')}"`);

  // Row 1 Sample
  const sampleRow1 = columns.map((c, idx) => {
    if (c.type === "number") {
      return idx === 0 ? "101" : String((idx + 1) * 25);
    }
    return `"${c.isPrimary ? "Example Item A" : `Sample ${c.name || "Text"} 1`}"`;
  });

  // Row 2 Sample
  const sampleRow2 = columns.map((c, idx) => {
    if (c.type === "number") {
      return idx === 0 ? "102" : String((idx + 1) * 50);
    }
    return `"${c.isPrimary ? "Example Item B" : `Sample ${c.name || "Text"} 2`}"`;
  });

  // Row 3 Sample
  const sampleRow3 = columns.map((c, idx) => {
    if (c.type === "number") {
      return idx === 0 ? "103" : String((idx + 1) * 75);
    }
    return `"${c.isPrimary ? "Example Item C" : `Sample ${c.name || "Text"} 3`}"`;
  });

  const csvContent = [
    headers.join(","),
    sampleRow1.join(","),
    sampleRow2.join(","),
    sampleRow3.join(","),
  ].join("\r\n");

  const sanitized = listName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "sample_list";
  return {
    filename: `${sanitized}_template.csv`,
    csvContent,
  };
}

/**
 * Trigger browser download of CSV string
 */
export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV text and extract headers and rows
 */
export function parseCsvRaw(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const nc = line[i + 1];
      if (c === '"') {
        if (inQ && nc === '"') {
          current += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        cells.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

/**
 * Validate and map CSV rows against target Advance List columns
 */
export function mapCsvToAdvanceListRows(
  csvText: string,
  columns: AdvanceListColumn[]
): {
  rows: AdvanceListRow[];
  headers: string[];
  totalRowsParsed: number;
  errors: string[];
  warnings: string[];
} {
  const { headers, rows: rawRows } = parseCsvRaw(csvText);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (headers.length === 0) {
    errors.push("The CSV file has no columns or is empty.");
    return { rows: [], headers: [], totalRowsParsed: 0, errors, warnings };
  }

  // Map header index to AdvanceListColumn
  const colIndexMap = new Map<number, AdvanceListColumn>();
  const unmappedHeaders: string[] = [];

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  headers.forEach((h, hIdx) => {
    const normH = normalize(h);
    const matched = columns.find(
      (c) => normalize(c.name) === normH || normalize(c.id) === normH
    );
    if (matched) {
      colIndexMap.set(hIdx, matched);
    } else {
      unmappedHeaders.push(h);
    }
  });

  if (unmappedHeaders.length > 0) {
    warnings.push(`Ignored ${unmappedHeaders.length} unmapped column(s): ${unmappedHeaders.join(", ")}`);
  }

  // Check if primary column is matched
  const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
  const isPrimaryMapped = Array.from(colIndexMap.values()).some((c) => c.id === primaryCol?.id);
  if (!isPrimaryMapped && columns.length > 0) {
    warnings.push(`Primary column "${primaryCol?.name || "Primary"}" was not found in CSV. Row labels will fallback to first available column.`);
  }

  const generatedRows: AdvanceListRow[] = [];

  rawRows.forEach((rowCells, rIdx) => {
    if (rowCells.length === 0 || rowCells.every((c) => !c || c.trim() === "")) return;

    const rowValues: Record<string, string | number> = {};
    columns.forEach((c) => {
      rowValues[c.id] = c.type === "number" ? 0 : "";
    });

    rowCells.forEach((cellVal, cIdx) => {
      const col = colIndexMap.get(cIdx);
      if (!col) return;

      const trimmed = cellVal.trim();
      if (col.type === "number") {
        const num = parseFloat(trimmed.replace(/,/g, ""));
        rowValues[col.id] = isNaN(num) ? 0 : num;
      } else {
        rowValues[col.id] = trimmed;
      }
    });

    // Derive primary label
    const primaryVal = rowValues[primaryCol?.id || ""];
    let label = "";
    if (primaryVal !== undefined && primaryVal !== null && String(primaryVal).trim() !== "") {
      label = String(primaryVal);
    } else {
      const firstNonEmpty = Object.values(rowValues).find((v) => v !== undefined && v !== null && String(v).trim() !== "");
      label = firstNonEmpty !== undefined ? String(firstNonEmpty) : `Row #${rIdx + 1}`;
    }

    generatedRows.push({
      id: `row_${Date.now()}_${rIdx}_${Math.floor(Math.random() * 1000)}`,
      label: label.trim(),
      values: rowValues,
      isDefault: rIdx === 0 && generatedRows.length === 0,
    });
  });

  return {
    rows: generatedRows,
    headers,
    totalRowsParsed: generatedRows.length,
    errors,
    warnings,
  };
}
