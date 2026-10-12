import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Check,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";

export interface ExportFieldConfig<T = any> {
  key: string;
  label: string;
  getValue?: (item: T) => string | number | null | undefined;
}

export interface ExportFilterOption {
  label: string;
  value: string;
}

export interface DataExportModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: T[];
  allFields: ExportFieldConfig<T>[];
  defaultSelectedFields?: string[];
  filenamePrefix: string;
  // Date configuration
  dateFieldKey?: keyof T | string;
  getDate?: (item: T) => string | Date | null | undefined;
  dateLabel?: string;
  // Status/category configuration
  statusFieldKey?: keyof T | string;
  getStatus?: (item: T) => string | null | undefined;
  statusLabel?: string;
  statusOptions?: ExportFilterOption[];
}

export function DataExportModal<T = any>({
  isOpen,
  onClose,
  title,
  subtitle = "Choose format, date range, and fields to export",
  data,
  allFields,
  defaultSelectedFields,
  filenamePrefix,
  dateFieldKey,
  getDate,
  dateLabel = "Date",
  statusFieldKey,
  getStatus,
  statusLabel = "Status",
  statusOptions,
}: DataExportModalProps<T>) {
  if (!isOpen) return null;

  // Format state
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");

  // Fields state
  const [fieldsMode, setFieldsMode] = useState<"all" | "selected">("all");
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>(() => {
    if (defaultSelectedFields && defaultSelectedFields.length > 0) {
      return defaultSelectedFields;
    }
    return allFields.map((f) => f.key);
  });
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");

  // Date Filter state
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [fromDate, setFromDate] = useState<string>("");
  const [tillDate, setTillDate] = useState<string>(todayStr);

  // Helper to resolve an item's date
  const resolveItemDate = (item: T): Date | null => {
    let raw: any = null;
    if (getDate) {
      raw = getDate(item);
    } else if (dateFieldKey) {
      raw = (item as any)[dateFieldKey as string];
    } else {
      const fallbackKeys = ["createdAt", "createdOn", "date", "lastContact", "dueDate", "timestamp", "updatedAt"];
      for (const k of fallbackKeys) {
        if ((item as any)[k]) {
          raw = (item as any)[k];
          break;
        }
      }
    }

    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    const parsed = new Date(String(raw));
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Helper to resolve an item's status
  const resolveItemStatus = (item: T): string => {
    if (getStatus) {
      return String(getStatus(item) || "").toLowerCase();
    }
    if (statusFieldKey) {
      return String((item as any)[statusFieldKey as string] || "").toLowerCase();
    }
    return "";
  };

  // Filtered dataset based on Till Date and From Date
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Date filtering
      if (fromDate || tillDate) {
        const itemDate = resolveItemDate(item);
        if (itemDate) {
          if (fromDate) {
            const start = new Date(fromDate + "T00:00:00");
            if (itemDate < start) return false;
          }
          if (tillDate) {
            const end = new Date(tillDate + "T23:59:59.999");
            if (itemDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [data, fromDate, tillDate]);

  // Visible fields based on search query in the field selector
  const visibleFieldOptions = useMemo(() => {
    if (!fieldSearchQuery.trim()) return allFields;
    const q = fieldSearchQuery.toLowerCase();
    return allFields.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
  }, [allFields, fieldSearchQuery]);

  // Execute export download
  const handleExport = () => {
    const activeFieldConfigs =
      fieldsMode === "all"
        ? allFields
        : allFields.filter((f) => selectedFieldKeys.includes(f.key));

    if (activeFieldConfigs.length === 0) {
      toast.error("Please select at least one field to export");
      return;
    }

    if (filteredData.length === 0) {
      toast.error("No records match your selected filters. Please adjust your criteria.");
      return;
    }

    const formatValue = (val: any): string => {
      if (val === null || val === undefined) return "";
      if (Array.isArray(val)) return val.join("; ");
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    };

    const headerRow = activeFieldConfigs.map((f) => f.label);

    const rows = filteredData.map((item) => {
      return activeFieldConfigs.map((f) => {
        let val: any;
        if (f.getValue) {
          val = f.getValue(item);
        } else {
          val = (item as any)[f.key];
        }
        return formatValue(val);
      });
    });

    const filename = `${filenamePrefix}_export_${tillDate || todayStr}.${exportFormat}`;

    if (exportFormat === "csv") {
      const csvHeader = headerRow
        .map((h) => `"${h.replace(/"/g, '""')}"`)
        .join(",");

      const csvRows = rows.map((r) =>
        r.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")
      );

      const csvContent = "\uFEFF" + [csvHeader, ...csvRows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      triggerDownload(blob, filename);
    } else {
      const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Export">
  <Table>
   <Row ss:StyleID="Header">
${headerRow.map((h) => `    <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("\n")}
   </Row>
${rows
  .map(
    (row) => `   <Row>
${row
  .map(
    (val) => `    <Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`
  )
  .join("\n")}
   </Row>`
  )
  .join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

      const blob = new Blob([xmlHeader], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;",
      });
      triggerDownload(blob, filename);
    }

    toast.success(`Exported ${filteredData.length} records successfully as ${exportFormat.toUpperCase()}`);
    onClose();
  };

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-4 z-10 animate-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1456f0] shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                {title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Format Selection Cards */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Excel (.xlsx) Card */}
              <div
                onClick={() => setExportFormat("xlsx")}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  exportFormat === "xlsx"
                    ? "border-blue-500 bg-blue-50/30 shadow-xs ring-1 ring-blue-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-xs text-slate-900">Excel (.xlsx)</span>
                  </div>
                  {exportFormat === "xlsx" && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Formatted spreadsheet with styled headers and native tables.
                </p>
              </div>

              {/* CSV (.csv) Card */}
              <div
                onClick={() => setExportFormat("csv")}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  exportFormat === "csv"
                    ? "border-blue-500 bg-blue-50/30 shadow-xs ring-1 ring-blue-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-xs text-slate-900">CSV (.csv)</span>
                  </div>
                  {exportFormat === "csv" && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Universal text file with UTF-8 encoding for maximum compatibility.
                </p>
              </div>
            </div>
          </div>

          {/* Date Inputs Row (From Date & Export Till Date) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                From Date (Optional)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs"
                style={{ height: "38px" }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-blue-700 block mb-1">
                Export Till Date
              </label>
              <input
                type="date"
                value={tillDate}
                onChange={(e) => setTillDate(e.target.value)}
                className="w-full text-xs bg-white border-2 border-blue-400 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-2xs"
                style={{ height: "38px" }}
              />
            </div>
          </div>

          {/* Clean Export Data Fields Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Export Data Fields
            </label>
            <select
              value={fieldsMode}
              onChange={(e) => setFieldsMode(e.target.value as "all" | "selected")}
              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs cursor-pointer"
              style={{ height: "38px" }}
            >
              <option value="all">All Fields ({allFields.length})</option>
              <option value="selected">
                Select Specific Fields ({selectedFieldKeys.length} of {allFields.length} selected)
              </option>
            </select>

            {/* When specific fields selected, clean compact picker */}
            {fieldsMode === "selected" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">
                    {selectedFieldKeys.length} of {allFields.length} selected
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedFieldKeys(allFields.map((f) => f.key))}
                      className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFieldKeys([])}
                      className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {allFields.length > 8 && (
                  <input
                    type="text"
                    placeholder="Search field names..."
                    value={fieldSearchQuery}
                    onChange={(e) => setFieldSearchQuery(e.target.value)}
                    className="w-full text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-blue-400"
                  />
                )}

                <div className="grid grid-cols-2 gap-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                  {visibleFieldOptions.map((field) => {
                    const isChecked = selectedFieldKeys.includes(field.key);
                    return (
                      <label
                        key={field.key}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? "bg-white border border-blue-200/60 shadow-2xs" : "hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFieldKeys([...selectedFieldKeys, field.key]);
                            } else {
                              setSelectedFieldKeys(selectedFieldKeys.filter((k) => k !== field.key));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 font-medium text-[11px] truncate">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer Actions */}
        <div className="shrink-0 flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="bg-[#1E293B] hover:bg-slate-950 text-white px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              Export {filteredData.length} {filteredData.length === 1 ? "Record" : "Records"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
