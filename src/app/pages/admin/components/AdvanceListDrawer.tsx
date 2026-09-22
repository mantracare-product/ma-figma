/**
 * AdvanceListDrawer.tsx
 * Path: src/app/pages/admin/components/AdvanceListDrawer.tsx
 *
 * Slide-out drawer for creating or editing an Advance List 2 definition.
 * Allows defining custom typed columns (String, Number), setting behavior properties
 * (Primary, Editable, Disable), downloading dynamically generated sample CSV templates,
 * and importing or managing list data rows.
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  Layers,
  Star,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Hash,
  Type,
  Lock,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdvanceListDefinition,
  AdvanceListColumn,
  AdvanceListRow,
  AdvanceColumnType,
  saveStoredAdvanceList,
  generateSampleCsvContent,
  downloadCsvFile,
  mapCsvToAdvanceListRows,
} from "../../../../lib/advanceListStore";

export interface AdvanceListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedList: AdvanceListDefinition) => void;
  editingList?: AdvanceListDefinition | null;
  zIndex?: number;
}

export function AdvanceListDrawer({
  isOpen,
  onClose,
  onSaved,
  editingList = null,
  zIndex = 100050,
}: AdvanceListDrawerProps) {
  // Form State
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<AdvanceListColumn[]>([
    { id: "col_item_name", name: "Item Name", type: "string", isPrimary: true, isEditable: false, isDisable: false },
    { id: "col_value", name: "Value / Price", type: "number", isPrimary: false, isEditable: true, isDisable: false },
  ]);
  const [rows, setRows] = useState<AdvanceListRow[]>([]);

  // CSV Import Modal & Feedback State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<AdvanceListRow[]>([]);
  const [csvImportMode, setCsvImportMode] = useState<"append" | "replace">("append");
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"schema" | "data">("schema");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form state when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (editingList) {
        setListName(editingList.name);
        setDescription(editingList.description || "");
        setColumns(
          editingList.columns && editingList.columns.length > 0
            ? editingList.columns
            : [
                { id: "col_item_name", name: "Item Name", type: "string", isPrimary: true, isEditable: false, isDisable: false },
              ]
        );
        setRows(editingList.rows || []);
      } else {
        const initialColId = `col_${Date.now()}`;
        setListName("");
        setDescription("");
        setColumns([
          { id: `${initialColId}_name`, name: "Item Name", type: "string", isPrimary: true, isEditable: false, isDisable: false },
          { id: `${initialColId}_price`, name: "Price", type: "number", isPrimary: false, isEditable: true, isDisable: false },
        ]);
        setRows([]);
      }
      setCsvFile(null);
      setCsvPreviewRows([]);
      setCsvWarnings([]);
      setCsvErrors([]);
      setActiveTab("schema");
    }
  }, [isOpen, editingList]);

  if (!isOpen) return null;

  // ── Column Management Helpers ─────────────────────────────────────────────
  const addColumn = () => {
    const colCount = columns.length + 1;
    const newColId = `col_${Date.now()}_${colCount}`;
    setColumns((prev) => [
      ...prev,
      {
        id: newColId,
        name: `Column ${colCount}`,
        type: "string",
        isPrimary: prev.length === 0,
        isEditable: false,
        isDisable: false,
      },
    ]);
  };

  const updateColumn = (index: number, updates: Partial<AdvanceListColumn>) => {
    setColumns((prev) => {
      const next = [...prev];
      const target = { ...next[index], ...updates };

      // If making this column primary:
      if (updates.isPrimary) {
        // Enforce exactly one primary column, and primary cannot be disabled
        return next.map((col, idx) => ({
          ...col,
          isPrimary: idx === index,
          isDisable: idx === index ? false : col.isDisable,
        }));
      }

      // If disabling: cannot be primary
      if (updates.isDisable && target.isPrimary) {
        target.isDisable = false;
      }

      next[index] = target;
      return next;
    });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) {
      toast.error("Advance List must have at least one column.");
      return;
    }
    const removedWasPrimary = columns[index].isPrimary;
    const nextCols = columns.filter((_, idx) => idx !== index);

    // If removed column was primary, nominate the first column as primary
    if (removedWasPrimary && nextCols.length > 0) {
      nextCols[0].isPrimary = true;
      nextCols[0].isDisable = false;
    }
    setColumns(nextCols);
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    const next = [...columns];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setColumns(next);
  };

  // ── Sample CSV Download ───────────────────────────────────────────────────
  const handleDownloadSampleCsv = () => {
    if (columns.length === 0) {
      toast.error("Please add at least one column before downloading a template.");
      return;
    }
    const { filename, csvContent } = generateSampleCsvContent(columns, listName || "advance_list");
    downloadCsvFile(filename, csvContent);
    toast.success(`Downloaded sample template: ${filename}`);
  };

  // ── CSV File Parsing & Preview ────────────────────────────────────────────
  const handleCsvFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setCsvErrors(["Please select a valid CSV (.csv) file."]);
      return;
    }

    setCsvFile(file);
    setCsvErrors([]);
    setCsvWarnings([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "";
        if (!text.trim()) {
          setCsvErrors(["The selected CSV file is empty."]);
          setCsvPreviewRows([]);
          return;
        }

        const result = mapCsvToAdvanceListRows(text, columns);
        if (result.errors.length > 0) {
          setCsvErrors(result.errors);
          setCsvPreviewRows([]);
        } else {
          setCsvPreviewRows(result.rows);
          setCsvWarnings(result.warnings);
          if (result.rows.length === 0) {
            setCsvErrors(["No data rows were found in the uploaded CSV."]);
          } else {
            toast.info(`Parsed ${result.rows.length} row(s) from ${file.name}`);
          }
        }
      } catch (err: any) {
        setCsvErrors([`Failed to parse CSV: ${err.message || "Invalid format"}`]);
        setCsvPreviewRows([]);
      }
    };
    reader.onerror = () => {
      setCsvErrors(["Failed to read the selected file."]);
    };
    reader.readAsText(file);
  };

  const applyCsvImport = () => {
    if (csvPreviewRows.length === 0) {
      toast.error("No valid CSV rows to import.");
      return;
    }

    if (csvImportMode === "replace") {
      setRows(csvPreviewRows);
      toast.success(`Replaced with ${csvPreviewRows.length} rows from CSV`);
    } else {
      setRows((prev) => [...prev, ...csvPreviewRows]);
      toast.success(`Appended ${csvPreviewRows.length} rows from CSV`);
    }

    // Reset CSV import staging
    setCsvFile(null);
    setCsvPreviewRows([]);
    setCsvWarnings([]);
    setCsvErrors([]);
  };

  // ── Manual Row Management ─────────────────────────────────────────────────
  const addRow = () => {
    const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
    const initialVals: Record<string, string | number> = {};
    columns.forEach((c) => {
      initialVals[c.id] = c.type === "number" ? 0 : "";
    });

    const newRowId = `row_${Date.now()}_${rows.length + 1}`;
    setRows((prev) => [
      ...prev,
      {
        id: newRowId,
        label: "",
        values: initialVals,
        isDefault: prev.length === 0,
      },
    ]);
  };

  const updateRowCell = (rowIndex: number, colId: string, rawVal: string) => {
    setRows((prev) => {
      const next = [...prev];
      const target = { ...next[rowIndex] };
      const col = columns.find((c) => c.id === colId);
      const isNumberCol = col?.type === "number";

      const parsedVal = isNumberCol
        ? rawVal === ""
          ? 0
          : isNaN(parseFloat(rawVal))
          ? 0
          : parseFloat(rawVal)
        : rawVal;

      const nextValues = { ...target.values, [colId]: parsedVal };
      target.values = nextValues;

      // If updating the primary column, sync row label
      const primaryCol = columns.find((c) => c.isPrimary) || columns[0];
      if (primaryCol && primaryCol.id === colId) {
        target.label = String(parsedVal);
      }

      next[rowIndex] = target;
      return next;
    });
  };

  const deleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleRowDefault = (index: number) => {
    setRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        isDefault: idx === index ? !r.isDefault : false,
      }))
    );
  };

  // ── Save Advance List Definition ──────────────────────────────────────────
  const handleSave = () => {
    const trimmedName = listName.trim();
    if (!trimmedName) {
      toast.error("Please enter a List Name.");
      return;
    }

    if (columns.length === 0) {
      toast.error("Please add at least one column.");
      return;
    }

    // Ensure all columns have names
    const emptyCol = columns.find((c) => !c.name.trim());
    if (emptyCol) {
      toast.error("All columns must have a valid name.");
      return;
    }

    // Ensure exactly one column is primary
    const primaryCol = columns.find((c) => c.isPrimary);
    if (!primaryCol) {
      columns[0].isPrimary = true;
    }

    const listId = editingList?.id || `adv_list_${Date.now()}`;
    const cleanColumns = columns.map((c, idx) => ({
      ...c,
      name: c.name.trim(),
      id: c.id || `col_${idx + 1}`,
      type: c.type || "string",
      isPrimary: Boolean(c.isPrimary),
      isEditable: Boolean(c.isEditable),
      isDisable: Boolean(c.isDisable),
    }));

    // Ensure row labels match primary column
    const resolvedPrimary = cleanColumns.find((c) => c.isPrimary) || cleanColumns[0];
    const cleanRows = rows.map((r, idx) => {
      const primaryVal = r.values[resolvedPrimary.id];
      return {
        ...r,
        id: r.id || `row_${idx + 1}`,
        label:
          primaryVal !== undefined && primaryVal !== null && String(primaryVal).trim() !== ""
            ? String(primaryVal).trim()
            : `Item #${idx + 1}`,
      };
    });

    const listDefinition: AdvanceListDefinition = {
      id: listId,
      name: trimmedName,
      description: description.trim() || undefined,
      columns: cleanColumns,
      rows: cleanRows,
      createdAt: editingList?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = saveStoredAdvanceList(listDefinition);
    toast.success(`Advance List "${saved.name}" saved successfully!`);
    onSaved(saved);
    onClose();
  };

  const primaryColumn = columns.find((c) => c.isPrimary) || columns[0];

  return createPortal(
    <div
      style={{ zIndex }}
      className="fixed inset-0 overflow-hidden flex justify-end animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  {editingList ? "Edit Advance List 2" : "Create Advance List 2"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Advance 2
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure typed columns, behavior properties, and import dataset via CSV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("schema")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "schema"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Schema & Columns ({columns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "data"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>2. Data & CSV Import ({rows.length} rows)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SCHEMA & COLUMNS */}
          {activeTab === "schema" && (
            <div className="space-y-6">
              {/* List Metadata */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    List Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={listName}
                    placeholder="e.g. Dental Procedures, Membership Tiers..."
                    onChange={(e) => setListName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Description / Purpose <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    placeholder="Brief description of this list dataset..."
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-slate-700"
                  />
                </div>
              </div>

              {/* Columns Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      List Columns & Behavior Rules
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configure typed columns (String, Number), mark 1 Primary column, and set Editable / Disable flags.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addColumn}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Column</span>
                  </button>
                </div>

                {/* Columns Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                        <th className="px-3 py-2.5 min-w-[160px]">Column Name</th>
                        <th className="px-2 py-2.5 text-center w-28">Type</th>
                        <th className="px-2 py-2.5 text-center w-20">
                          <span className="text-blue-700 flex items-center justify-center gap-1">
                            <Star className="w-3 h-3 fill-blue-500 text-blue-500" />
                            <span>Primary</span>
                          </span>
                        </th>
                        <th className="px-2 py-2.5 text-center w-20">
                          <span className="text-emerald-700">Editable</span>
                        </th>
                        <th className="px-2 py-2.5 text-center w-20">
                          <span className="text-slate-600">Disable</span>
                        </th>
                        <th className="px-2 py-2.5 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {columns.map((col, idx) => {
                        const isPrimary = Boolean(col.isPrimary);
                        const isEditable = Boolean(col.isEditable);
                        const isDisable = Boolean(col.isDisable);

                        return (
                          <tr
                            key={col.id || idx}
                            className={`transition-colors ${
                              isPrimary ? "bg-blue-50/30" : "hover:bg-slate-50/60"
                            }`}
                          >
                            {/* Column Name */}
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={col.name}
                                placeholder="Column Name..."
                                onChange={(e) => updateColumn(idx, { name: e.target.value })}
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800"
                              />
                            </td>

                            {/* Column Type (String or Number) */}
                            <td className="px-2 py-2.5 text-center">
                              <select
                                value={col.type}
                                onChange={(e) =>
                                  updateColumn(idx, { type: e.target.value as AdvanceColumnType })
                                }
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 cursor-pointer"
                              >
                                <option value="string">String (Text)</option>
                                <option value="number">Number</option>
                              </select>
                            </td>

                            {/* Primary (Exactly 1 Column) */}
                            <td className="px-2 py-2.5 text-center">
                              <label
                                className="inline-flex items-center justify-center p-1 cursor-pointer"
                                title="Set as Primary (Main Label)"
                              >
                                <input
                                  type="radio"
                                  name="advanceListPrimaryColumn"
                                  checked={isPrimary}
                                  onChange={() => updateColumn(idx, { isPrimary: true })}
                                  className="w-4 h-4 text-blue-600 cursor-pointer accent-blue-600"
                                />
                              </label>
                            </td>

                            {/* Editable Checkbox */}
                            <td className="px-2 py-2.5 text-center">
                              <label
                                className="inline-flex items-center justify-center p-1 cursor-pointer"
                                title="Allow editing value per record"
                              >
                                <input
                                  type="checkbox"
                                  checked={isEditable}
                                  onChange={(e) => updateColumn(idx, { isEditable: e.target.checked })}
                                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                                />
                              </label>
                            </td>

                            {/* Disable Checkbox */}
                            <td className="px-2 py-2.5 text-center">
                              <label
                                className={`inline-flex items-center justify-center p-1 ${
                                  isPrimary ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title={isPrimary ? "Primary column cannot be disabled" : "Lock column as disabled"}
                              >
                                <input
                                  type="checkbox"
                                  disabled={isPrimary}
                                  checked={isDisable}
                                  onChange={(e) => updateColumn(idx, { isDisable: e.target.checked })}
                                  className="w-4 h-4 text-slate-600 rounded cursor-pointer accent-slate-600"
                                />
                              </label>
                            </td>

                            {/* Actions (Reorder / Delete) */}
                            <td className="px-2 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveColumn(idx, -1)}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === columns.length - 1}
                                  onClick={() => moveColumn(idx, 1)}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={columns.length <= 1}
                                  onClick={() => removeColumn(idx)}
                                  className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                                  title="Delete column"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2 text-xs text-blue-800">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Primary Column:</strong> &ldquo;{primaryColumn?.name || "Column"}&rdquo; will be displayed as the main title when this list is selected in records.
                  </div>
                </div>
              </div>

              {/* Step 2 CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("data")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  <span>Proceed to Data & CSV Import</span>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & CSV IMPORT */}
          {activeTab === "data" && (
            <div className="space-y-6">
              {/* CSV Import & Template Actions Card */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Import Data via CSV
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Download a sample template with your exact column schema or upload an existing CSV.
                      </p>
                    </div>
                  </div>

                  {/* Download Sample CSV Button */}
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample CSV</span>
                  </button>
                </div>

                {/* Drag and Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsCsvDragging(true);
                  }}
                  onDragLeave={() => setIsCsvDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsCsvDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleCsvFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    isCsvDragging
                      ? "border-indigo-500 bg-indigo-100/50"
                      : "border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <FileSpreadsheet className="w-7 h-7 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {csvFile ? csvFile.name : "Click to select or drag & drop CSV file"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Columns expected: {columns.map((c) => c.name).join(", ")}
                    </span>
                  </div>
                </div>

                {/* CSV Errors / Warnings */}
                {csvErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-700">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>CSV Errors</span>
                    </div>
                    {csvErrors.map((err, i) => (
                      <p key={i} className="text-[11px] pl-5">{err}</p>
                    ))}
                  </div>
                )}

                {csvWarnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>CSV Notices</span>
                    </div>
                    {csvWarnings.map((w, i) => (
                      <p key={i} className="text-[11px] pl-5">{w}</p>
                    ))}
                  </div>
                )}

                {/* CSV Staged Preview */}
                {csvPreviewRows.length > 0 && (
                  <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {csvPreviewRows.length} rows ready to import
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="csvMode"
                            checked={csvImportMode === "append"}
                            onChange={() => setCsvImportMode("append")}
                            className="accent-indigo-600"
                          />
                          <span className="text-slate-700">Append to existing</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="csvMode"
                            checked={csvImportMode === "replace"}
                            onChange={() => setCsvImportMode("replace")}
                            className="accent-indigo-600"
                          />
                          <span className="text-slate-700">Replace current rows</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={applyCsvImport}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Apply CSV Import ({csvPreviewRows.length} Rows)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Rows List / Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Defined List Rows ({rows.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Add, edit, or toggle default options for this Advance List.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>

                {rows.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      No data rows in this list yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Import a CSV file using the template above or click &ldquo;+ Add Row&rdquo; to insert manually.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {rows.map((row, rIdx) => {
                      return (
                        <div
                          key={row.id || rIdx}
                          className={`p-3 bg-white border rounded-xl space-y-2.5 transition-colors shadow-2xs ${
                            row.isDefault
                              ? "border-blue-300 bg-blue-50/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                #{rIdx + 1}
                              </span>
                              {row.isDefault && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Star className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                                  <span>Default Option</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleRowDefault(rIdx)}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded border cursor-pointer transition-colors ${
                                  row.isDefault
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {row.isDefault ? "Default" : "Set Default"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRow(rIdx)}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Grid of Cells */}
                          <div className="grid grid-cols-2 gap-2">
                            {columns.map((col) => {
                              const isPrimary = col.isPrimary;
                              const val = row.values[col.id] ?? "";

                              return (
                                <div key={col.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                                    <div className="flex items-center gap-1">
                                      <span>{col.name}</span>
                                      {isPrimary && (
                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-normal">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-mono uppercase">
                                      {col.type}
                                    </span>
                                  </div>
                                  <input
                                    type={col.type === "number" ? "number" : "text"}
                                    value={val}
                                    placeholder={`${col.name}...`}
                                    onChange={(e) => updateRowCell(rIdx, col.id, e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-800"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save & Apply Advance List</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdvanceListDrawer;
