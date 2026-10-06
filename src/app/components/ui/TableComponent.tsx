import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Settings as SettingsIcon,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  X,
  RotateCcw,
} from "lucide-react";
import { Tooltip } from "./Tooltip";
import { toast } from "sonner";

export interface TableColumn<T> {
  id?: string;
  key?: string;
  header: string;
  accessorKey?: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  defaultVisible?: boolean;
}

export interface TableRowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  isDanger?: boolean;
  disabled?: boolean | ((row: T) => boolean);
  hidden?: boolean | ((row: T) => boolean);
}

export interface TableBulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: Set<any>) => void;
  variant?: "danger" | "default";
  isDanger?: boolean;
}

export interface TableComponentProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  getRowId?: (row: T, index: number) => any;
  rowActions?: TableRowAction<T>[] | ((row: T) => TableRowAction<T>[]);
  enableSelection?: boolean;
  selectedIds?: Set<any>;
  onSelectionChange?: (selectedIds: Set<any>) => void;
  bulkActions?: TableBulkAction[];
  enableColumnCustomization?: boolean;
  defaultRowsPerPage?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  pagination?: boolean;
  onRowClick?: (row: T) => void;
  tableId?: string;
  renderFooter?: (orderedVisibleColumns: TableColumn<T>[]) => React.ReactNode;
}

export function TableComponent<T>({
  data,
  columns,
  getRowId = (row: any, idx: number) => row.id ?? row.key ?? idx,
  rowActions,
  enableSelection = true,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  enableColumnCustomization = true,
  defaultRowsPerPage = 20,
  pageSizeOptions = [20, 50, 100],
  emptyMessage = "No records found.",
  isLoading = false,
  className = "",
  pagination = true,
  onRowClick,
  renderFooter,
}: TableComponentProps<T>) {
  const getColId = (c: TableColumn<T>): string => c.id || c.key || c.header;

  // Column customization state
  const defaultColumnOrder = useMemo(() => columns.map(getColId), [columns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    columns.forEach((col) => {
      init[getColId(col)] = col.defaultVisible !== false;
    });
    return init;
  });

  // Sync if columns array changes
  useEffect(() => {
    setColumnOrder(columns.map(getColId));
    setVisibleColumns((prev) => {
      const next = { ...prev };
      columns.forEach((c) => {
        const cid = getColId(c);
        if (next[cid] === undefined) next[cid] = c.defaultVisible !== false;
      });
      return next;
    });
  }, [columns]);

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [openActionRowId, setOpenActionRowId] = useState<string | number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Uncontrolled selection fallback
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string | number>>(new Set());
  const selectedIds = controlledSelectedIds !== undefined ? controlledSelectedIds : internalSelectedIds;

  const handleSelectionUpdate = (newSet: Set<string | number>) => {
    if (onSelectionChange) {
      onSelectionChange(newSet);
    } else {
      setInternalSelectedIds(newSet);
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColumnMenu(false);
      setOpenActionRowId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Compute Pagination
  const totalItems = data.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / rowsPerPage)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = pagination ? (safeCurrentPage - 1) * rowsPerPage : 0;
  const endIndex = pagination ? Math.min(startIndex + rowsPerPage, totalItems) : totalItems;
  const pageRows = useMemo(() => {
    return pagination ? data.slice(startIndex, endIndex) : data;
  }, [data, startIndex, endIndex, pagination]);

  // Page selection helpers
  const pageRowIds = useMemo(() => {
    return pageRows.map((row, idx) => getRowId(row, startIndex + idx));
  }, [pageRows, getRowId, startIndex]);

  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageRowIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      pageRowIds.forEach((id) => next.delete(id));
    } else {
      pageRowIds.forEach((id) => next.add(id));
    }
    handleSelectionUpdate(next);
  };

  const handleToggleRow = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    handleSelectionUpdate(next);
  };

  // Column reorder helpers
  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= columnOrder.length) return;
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const columnMap = useMemo(() => {
    const map = new Map<string, TableColumn<T>>();
    columns.forEach((c) => map.set(getColId(c), c));
    return map;
  }, [columns]);

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .map((id) => columnMap.get(id))
      .filter((c): c is TableColumn<T> => Boolean(c && visibleColumns[getColId(c)] !== false));
  }, [columnOrder, columnMap, visibleColumns]);

  const hasLeadingControls = enableSelection || enableColumnCustomization || Boolean(rowActions);

  return (
    <div className={`bg-white border border-gray-200 shadow-2xs overflow-hidden rounded-none ${className}`}>
      {/* ── Selection Action Banner ── */}
      {enableSelection && selectedIds.size > 0 && (
        <div className="bg-[#E8F0FE] border-b border-[#D2E3FC] px-4 py-2 flex items-center justify-between rounded-none">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#1967D2]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
            </span>
            <button
              type="button"
              onClick={() => handleSelectionUpdate(new Set())}
              className="text-xs text-gray-600 hover:text-gray-900 underline cursor-pointer"
            >
              Clear selection
            </button>
          </div>
          {bulkActions && bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              {bulkActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => action.onClick(selectedIds)}
                  className={`px-2.5 py-1 text-xs rounded-none flex items-center gap-1.5 cursor-pointer font-medium transition-colors ${
                    action.isDanger || action.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-[#181e25] hover:bg-[#2c3e50] text-white"
                  }`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Table Element ── */}
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-xs border-collapse">
          {/* ── Header ── */}
          <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white select-none rounded-none border-b border-border/80">
            <tr>
              {/* Column 1: Checkbox (Select All) */}
              {enableSelection && (
                <th className="px-3 py-1.5 w-10 text-center rounded-none align-middle">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer rounded-none border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                      aria-label="Select all on this page"
                    />
                  </div>
                </th>
              )}

              {/* Column 2: Gear Icon (Column Manager Dropdown) */}
              {(enableColumnCustomization || rowActions) && (
                <th className="px-2 py-1.5 text-center relative w-9 rounded-none align-middle">
                  <div className="relative inline-flex items-center justify-center">
                    {enableColumnCustomization ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColumnMenu((v) => !v);
                        }}
                        className="p-1 hover:bg-white/10 rounded-none transition-colors text-[#E5E7EB] hover:text-white cursor-pointer"
                        title="Customize Columns (Add / Remove / Reorder)"
                        aria-label="Customize Columns"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-4 h-4 inline-block" />
                    )}

                    {/* Column Customization Popover */}
                    {showColumnMenu && (
                      <div
                        className="absolute left-0 top-full mt-2 w-64 bg-white text-gray-800 border border-gray-200 rounded-none shadow-2xl p-3 z-50 text-left normal-case tracking-normal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">Customize Columns</h4>
                            <p className="text-[10px] text-gray-500">Toggle visibility and reorder</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowColumnMenu(false)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded-none cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {columnOrder.map((colId, idx) => {
                            const col = columnMap.get(colId);
                            if (!col) return null;
                            const isVisible = visibleColumns[colId] !== false;
                            return (
                              <div
                                key={colId}
                                className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 text-xs gap-2 rounded-none"
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={(e) => {
                                      const currentlyVisibleCount = Object.values(visibleColumns).filter(Boolean).length;
                                      if (!e.target.checked && currentlyVisibleCount <= 1) {
                                        toast.error("At least one column must be visible");
                                        return;
                                      }
                                      setVisibleColumns((p) => ({ ...p, [colId]: e.target.checked }));
                                    }}
                                    className="w-3.5 h-3.5 rounded-none border-gray-300 text-primary cursor-pointer"
                                  />
                                  <span className="truncate font-medium text-gray-700">
                                    {col.header}
                                  </span>
                                </label>

                                {/* Move Up / Down Buttons */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => moveColumn(idx, idx - 1)}
                                    disabled={idx === 0}
                                    className="p-1 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Move up"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveColumn(idx, idx + 1)}
                                    disabled={idx === columnOrder.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Move down"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setColumnOrder(defaultColumnOrder);
                              const resetVis: Record<string, boolean> = {};
                              columns.forEach((c) => {
                                resetVis[c.id] = c.defaultVisible !== false;
                              });
                              setVisibleColumns(resetVis);
                            }}
                            className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowColumnMenu(false)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-semibold rounded-none cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
              )}

              {/* Data Column Headers (Center-Aligned by Default) */}
              {orderedVisibleColumns.map((col) => {
                const alignClass =
                  col.align === "left"
                    ? "text-left"
                    : col.align === "right"
                    ? "text-right"
                    : "text-center";
                return (
                  <th
                    key={getColId(col)}
                    className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap rounded-none ${alignClass}`}
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      width: col.width,
                      minWidth: col.minWidth,
                      maxWidth: col.maxWidth,
                    }}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <tr>
                <td
                  colSpan={(enableSelection ? 1 : 0) + (enableColumnCustomization || rowActions ? 1 : 0) + orderedVisibleColumns.length}
                  className="py-14 text-center text-xs text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={(enableSelection ? 1 : 0) + (enableColumnCustomization || rowActions ? 1 : 0) + orderedVisibleColumns.length}
                  className="py-12 text-center text-xs text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIdx) => {
                const globalIdx = startIndex + rowIdx;
                const rowId = getRowId(row, globalIdx);
                const isSelected = selectedIds.has(rowId);

                // Compute row actions
                const activeActions = typeof rowActions === "function" ? rowActions(row) : rowActions;
                const visibleActions = (activeActions || []).filter((act) => {
                  if (typeof act.hidden === "function") return !act.hidden(row);
                  return !act.hidden;
                });

                return (
                  <tr
                    key={String(rowId)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`border-b border-border/60 transition-colors h-[32px] rounded-none ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${isSelected ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"}`}
                  >
                    {/* Column 1: Row Checkbox */}
                    {enableSelection && (
                      <td
                        className="px-3 py-1 w-10 text-center rounded-none align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(rowId)}
                            className="w-3.5 h-3.5 cursor-pointer rounded-none border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                          />
                        </div>
                      </td>
                    )}

                    {/* Column 2: 3-Dots Hamburger Actions Menu */}
                    {(enableColumnCustomization || rowActions) && (
                      <td
                        className="px-2 py-1 text-center relative w-9 rounded-none align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {visibleActions.length > 0 ? (
                          <div className="relative inline-flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionRowId(openActionRowId === rowId ? null : rowId);
                              }}
                              className="p-1 hover:bg-gray-200/80 rounded-none transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
                              title="Actions"
                              aria-label="Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {openActionRowId === rowId && (
                              <div
                                className="absolute left-7 top-1/2 -translate-y-1/2 bg-white rounded-none shadow-xl border border-gray-200 py-1 z-50 min-w-[150px] text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {visibleActions.map((action, actIdx) => {
                                  const isDisabled =
                                    typeof action.disabled === "function"
                                      ? action.disabled(row)
                                      : action.disabled;
                                  return (
                                    <button
                                      key={actIdx}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        setOpenActionRowId(null);
                                        action.onClick(row);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors rounded-none ${
                                        isDisabled
                                          ? "opacity-40 cursor-not-allowed text-gray-400"
                                          : action.isDanger
                                          ? "text-red-600 hover:bg-red-50 cursor-pointer"
                                          : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                                      }`}
                                    >
                                      {action.icon}
                                      <span>{action.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                      </td>
                    )}

                    {/* Data Cells (Center-Aligned by Default) */}
                    {orderedVisibleColumns.map((col) => {
                      const alignClass =
                        col.align === "left"
                          ? "text-left"
                          : col.align === "right"
                          ? "text-right"
                          : "text-center";
                      const justifyClass =
                        col.align === "left"
                          ? "justify-start"
                          : col.align === "right"
                          ? "justify-end"
                          : "justify-center";

                      let content: React.ReactNode;
                      if (col.render) {
                        content = col.render(row, globalIdx);
                      } else if (col.accessorKey) {
                        content = String((row as any)[col.accessorKey] ?? "");
                      } else {
                        content = null;
                      }

                      return (
                        <td
                          key={getColId(col)}
                          className={`px-3.5 py-1 text-xs text-gray-800 whitespace-nowrap rounded-none align-middle ${alignClass}`}
                          style={{
                            width: col.width,
                            minWidth: col.minWidth,
                            maxWidth: col.maxWidth,
                          }}
                        >
                          <div className={`w-full flex items-center ${justifyClass}`}>
                            {content}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {renderFooter && (
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 text-[11px] sticky bottom-0 z-10 shadow-xs">
              {renderFooter(orderedVisibleColumns)}
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Bottom Pagination Toolbar ── */}
      {pagination && (
        <div className="border-t border-border px-4 py-2.5 bg-white rounded-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Rows per page:
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setRowsPerPage(newSize);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-input-background border border-input rounded-none text-xs outline-none cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip text="First Page">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 hover:bg-muted rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip text="Previous Page">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 hover:bg-muted rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <span className="text-xs px-2 text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                Page {safeCurrentPage} of {totalPages}
              </span>
              <Tooltip text="Next Page">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 hover:bg-muted rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip text="Last Page">
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 hover:bg-muted rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TableComponent;
