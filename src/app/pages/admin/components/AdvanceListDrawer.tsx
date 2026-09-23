import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  Layers,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
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
  // Form State - Start empty for new list
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<AdvanceListColumn[]>([]);
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
        setListName(editingList.name || "");
        setDescription(editingList.description || "");
        setColumns(editingList.columns || []);
        setRows(editingList.rows || []);
      } else {
        setListName("");
        setDescription("");
        setColumns([]);
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
        isPrimary: prev.length === 0, // First column added is automatically marked as primary
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
    const removedWasPrimary = columns[index]?.isPrimary;
    const nextCols = columns.filter((_, idx) => idx !== index);

    // If removed column was primary and other columns remain, nominate the first column as primary
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
    if (columns.length === 0) {
      toast.error("Please add columns in Tab 1 before creating rows.");
      return;
    }
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
      toast.error("Please add at least one column to this Advance List.");
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
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {editingList ? "Edit Advance List 2" : "Create Advance List 2"}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Advance 2
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-2 border-b border-slate-200 bg-white flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("schema")}
            className={`flex items-center gap-1.5 pb-2.5 px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "schema"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Schema & Columns ({columns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-1.5 pb-2.5 px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "data"
                ? "border-blue-600 text-blue-600"
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
            <div className="space-y-5">
              {/* List Metadata */}
              <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      List Name <span className="text-red-500">*</span>
                    </label>
                    <InfoTooltip text="Display name for this Advance List dataset (e.g., Procedures, Price Book, Inventory)." />
                  </div>
                  <input
                    type="text"
                    value={listName}
                    placeholder="e.g. Dental Procedures, Membership Tiers..."
                    onChange={(e) => setListName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Description <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <InfoTooltip text="Optional notes or documentation for this dataset." />
                  </div>
                  <input
                    type="text"
                    value={description}
                    placeholder="Brief description of this list dataset..."
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>
              </div>

              {/* Columns Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      List Columns & Behavior Rules
                    </h3>
                    <InfoTooltip text="Define typed columns. Exactly one column must be marked Primary (acts as the record title). Editable allows per-record value overrides, and Disable locks columns as read-only." />
                  </div>

                  <button
                    type="button"
                    onClick={addColumn}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Column</span>
                  </button>
                </div>

                {/* Columns Table / Empty State */}
                {columns.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700">No columns defined yet</p>
                      <p className="text-[11px] text-slate-400">Click &ldquo;Add Column&rdquo; above or below to build your column schema.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addColumn}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Column</span>
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                          <th className="px-3 py-2.5 min-w-[160px]">Column Name</th>
                          <th className="px-2 py-2.5 text-center w-28">
                            <span className="inline-flex items-center justify-center gap-1">
                              Type
                              <InfoTooltip text="Column data type: String (Text) or Number." />
                            </span>
                          </th>
                          <th className="px-2 py-2.5 text-center w-20">
                            <span className="inline-flex items-center justify-center gap-1 text-slate-700 font-bold">
                              Primary
                              <InfoTooltip text="Main title/label displayed when this item is selected in records. Exactly one column must be primary." />
                            </span>
                          </th>
                          <th className="px-2 py-2.5 text-center w-20">
                            <span className="inline-flex items-center justify-center gap-1 text-slate-700 font-bold">
                              Editable
                              <InfoTooltip text="Allows users to edit and override this column's value on individual records." />
                            </span>
                          </th>
                          <th className="px-2 py-2.5 text-center w-20">
                            <span className="inline-flex items-center justify-center gap-1 text-slate-700 font-bold">
                              Disable
                              <InfoTooltip text="Locks this column as read-only. Values cannot be changed on records." />
                            </span>
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
                                isPrimary ? "bg-blue-50/25" : "hover:bg-slate-50/60"
                              }`}
                            >
                              {/* Column Name */}
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={col.name}
                                  placeholder="Column Name..."
                                  onChange={(e) => updateColumn(idx, { name: e.target.value })}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                                />
                              </td>

                              {/* Column Type (String or Number) */}
                              <td className="px-2 py-2.5 text-center">
                                <select
                                  value={col.type}
                                  onChange={(e) =>
                                    updateColumn(idx, { type: e.target.value as AdvanceColumnType })
                                  }
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
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
                                    onClick={() => removeColumn(idx)}
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
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
                )}
              </div>

              {/* Step 2 CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (columns.length === 0) {
                      toast.error("Please add at least one column before proceeding.");
                      return;
                    }
                    setActiveTab("data");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                >
                  <span>Proceed to Data & CSV Import</span>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & CSV IMPORT */}
          {activeTab === "data" && (
            <div className="space-y-5">
              {/* CSV Import & Template Actions Card */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Import Data via CSV
                      </h4>
                      <InfoTooltip text="Download a sample template with your exact columns schema or upload an existing CSV file." />
                    </div>
                  </div>

                  {/* Download Sample CSV Button */}
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
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
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
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
                    <FileSpreadsheet className="w-7 h-7 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700">
                      {csvFile ? csvFile.name : "Click to select or drag & drop CSV file"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Columns expected: {columns.length > 0 ? columns.map((c) => c.name).join(", ") : "None defined"}
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
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
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
                            className="accent-blue-600"
                          />
                          <span className="text-slate-700">Append to existing</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="csvMode"
                            checked={csvImportMode === "replace"}
                            onChange={() => setCsvImportMode("replace")}
                            className="accent-blue-600"
                          />
                          <span className="text-slate-700">Replace current rows</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={applyCsvImport}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Defined List Rows ({rows.length})
                    </h3>
                    <InfoTooltip text="Manage row entries and default choices for this dataset." />
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>

                {rows.length === 0 ? (
                  <div className="p-8 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      No data rows in this list yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Import a CSV file using the template above or click &ldquo;+ Add Row&rdquo; to insert manually.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-96 shadow-2xs bg-white">
                    <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                      <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-2xs">
                        <tr className="text-[11px] font-bold text-slate-700">
                          <th className="px-2.5 py-2 text-center w-12 text-slate-500 font-mono">#</th>
                          {columns.map((col) => (
                            <th key={col.id} className="px-3 py-2 min-w-[140px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{col.name}</span>
                                {col.isPrimary && (
                                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    Primary
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-slate-400 uppercase font-normal">
                                  ({col.type})
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center w-16">Default</th>
                          <th className="px-2 py-2 text-center w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row, rIdx) => (
                          <tr
                            key={row.id || rIdx}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              row.isDefault ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <td className="px-2.5 py-2 text-center font-mono font-bold text-slate-400 text-[11px]">
                              {rIdx + 1}
                            </td>

                            {columns.map((col) => {
                              const val = row.values[col.id] ?? "";
                              return (
                                <td key={col.id} className="px-2.5 py-1.5">
                                  <input
                                    type={col.type === "number" ? "number" : "text"}
                                    value={val}
                                    placeholder={`${col.name}...`}
                                    onChange={(e) => updateRowCell(rIdx, col.id, e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-medium text-slate-800 transition-all"
                                  />
                                </td>
                              );
                            })}

                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleRowDefault(rIdx)}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  row.isDefault
                                    ? "text-amber-500 hover:text-amber-600 bg-amber-50"
                                    : "text-slate-300 hover:text-slate-500"
                                }`}
                                title={row.isDefault ? "Default row (Click to unset)" : "Set as default row"}
                              >
                                <Star className={`w-3.5 h-3.5 ${row.isDefault ? "fill-amber-400 text-amber-500" : ""}`} />
                              </button>
                            </td>

                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => deleteRow(rIdx)}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
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

