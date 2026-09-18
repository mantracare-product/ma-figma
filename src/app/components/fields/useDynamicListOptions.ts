import { useState, useEffect, useMemo } from "react";
import type { ListBindConfig, FieldOption, FieldDefinition, ListFieldConfig } from "../../context/FieldRegistryContext";
import { useFieldRegistry, normalizeLegacyColumn } from "../../context/FieldRegistryContext";
import { fetchCrmRecords } from "./useCrmBindOptions";
import { TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { CLIENTS_STORE_EVENT } from "../../../lib/clientProcessState";
import { PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";

export const RECORD_DATA_CHANGED_EVENT = "ma_record_data_changed";

function applySortOrder(options: FieldOption[], sortOrder?: ListFieldConfig["sortOrder"]): FieldOption[] {
  if (!sortOrder || sortOrder === "manual") {
    return [...options].sort((a, b) => ((a.index ?? 0) - (b.index ?? 0)));
  }
  if (sortOrder === "alphabetical_asc") {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
  }
  if (sortOrder === "alphabetical_desc") {
    return [...options].sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true, sensitivity: "base" }));
  }
  if (sortOrder === "recent") {
    return [...options].reverse();
  }
  return options;
}

export function useDynamicListOptions(
  listBindConfig?: ListBindConfig,
  staticOptions: FieldOption[] = [],
  recordData?: Record<string, any>,
  listConfig?: ListFieldConfig
): { options: FieldOption[]; loading: boolean } {
  const { getAllFields } = useFieldRegistry();
  const [version, setVersion] = useState(0);

  // Re-fetch on storage, CRM, and record state change events
  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);

    window.addEventListener(TEAM_STORE_EVENT, handleUpdate);
    window.addEventListener(CLIENTS_STORE_EVENT, handleUpdate);
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener(RECORD_DATA_CHANGED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("ma_services_changed", handleUpdate);
    window.addEventListener("organizationChanged", handleUpdate);

    return () => {
      window.removeEventListener(TEAM_STORE_EVENT, handleUpdate);
      window.removeEventListener(CLIENTS_STORE_EVENT, handleUpdate);
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener(RECORD_DATA_CHANGED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("ma_services_changed", handleUpdate);
      window.removeEventListener("organizationChanged", handleUpdate);
    };
  }, [listBindConfig?.sourceType, listConfig?.liveLinkedFieldKey]);

  const resolved = useMemo(() => {
    let baseOptions: FieldOption[] = [...staticOptions];

    // Live Two-Way Discovery Link Option
    if (listConfig?.liveLinkedFieldKey) {
      const linkedKey = listConfig.liveLinkedFieldKey;
      const discoveredValues = new Set<string>();

      // Scan in-memory recordData
      if (recordData) {
        const val = recordData[linkedKey];
        if (val) {
          if (Array.isArray(val)) val.forEach((v) => v && discoveredValues.add(String(v)));
          else discoveredValues.add(String(val));
        }
      }

      // Scan sessionStorage records
      try {
        const rawClients = sessionStorage.getItem("clients");
        if (rawClients) {
          const parsed = JSON.parse(rawClients);
          if (Array.isArray(parsed)) {
            parsed.forEach((rec: any) => {
              const v = rec[linkedKey];
              if (v) {
                if (Array.isArray(v)) v.forEach((sub) => sub && discoveredValues.add(String(sub)));
                else discoveredValues.add(String(v));
              }
            });
          }
        }
      } catch {}

      // Add discovered values that aren't already in staticOptions
      const existingValues = new Set(baseOptions.map((o) => String(o.value).toLowerCase()));
      discoveredValues.forEach((disc) => {
        const cleanVal = disc.trim();
        if (cleanVal && !existingValues.has(cleanVal.toLowerCase())) {
          baseOptions.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            label: cleanVal,
            value: cleanVal,
            valueType: "text",
            index: baseOptions.length + 1,
          });
          existingValues.add(cleanVal.toLowerCase());
        }
      });
    }

    if (!listBindConfig?.sourceType) {
      return { options: applySortOrder(baseOptions, listConfig?.sortOrder), loading: false };
    }

    try {
      // 1. CRM Module Binding
      if (listBindConfig.sourceType === "crm" && listBindConfig.crmModule) {
        const records = fetchCrmRecords(listBindConfig.crmModule);
        const displayProp = listBindConfig.displayField || "name";
        const opts: FieldOption[] = records.map((rec: any, idx: number) => {
          const val = String(rec.id ?? `opt_${idx}`);
          const label = String(rec[displayProp] || rec.name || rec.title || val);
          return { id: idx + 1, label, value: val, valueType: "text", index: idx + 1 };
        });
        return { options: applySortOrder(opts, listConfig?.sortOrder), loading: false };
      }

      // 2. Structured Open List Binding
      if (
        (listBindConfig.sourceType === "open_list" || listBindConfig.sourceType === "group") &&
        listBindConfig.targetFieldKey
      ) {
        const allFields = getAllFields("client");
        const targetField = allFields.find((f) => f.key === listBindConfig.targetFieldKey);
        const SKIP_KEYS = new Set(["id", "_id", "__type"]);
        const collectedLabels: string[] = [];

        const joinEntryValues = (item: any): string | null => {
          if (!item) return null;
          if (typeof item === "string") {
            try {
              const parsed = JSON.parse(item);
              if (parsed && typeof parsed === "object") return joinEntryValues(parsed);
            } catch {}
            return item.trim() || null;
          }
          if (typeof item !== "object") return null;
          const parts: string[] = [];
          for (const [k, v] of Object.entries(item)) {
            if (SKIP_KEYS.has(k)) continue;
            const sv = String(v ?? "").trim();
            if (sv && sv !== "[object Object]") parts.push(sv);
          }
          return parts.length > 0 ? parts.join(", ") : null;
        };

        const processRawData = (rawData: any) => {
          if (!rawData) return;
          let data = rawData;
          if (typeof data === "string" && data.trim()) {
            try { data = JSON.parse(data); } catch {}
          }
          if (Array.isArray(data)) {
            data.forEach((entry) => {
              const label = joinEntryValues(entry);
              if (label) collectedLabels.push(label);
            });
          } else if (data && typeof data === "object") {
            const label = joinEntryValues(data);
            if (label) collectedLabels.push(label);
          }
        };

        if (recordData) {
          processRawData(recordData[listBindConfig.targetFieldKey]);
          for (const [k, v] of Object.entries(recordData)) {
            if (k.endsWith(`_${listBindConfig.targetFieldKey}`) || k === listBindConfig.targetFieldKey) {
              processRawData(v);
            }
          }
        }

        try {
          const rawClients = sessionStorage.getItem("clients");
          if (rawClients) {
            const parsedClients = JSON.parse(rawClients);
            if (Array.isArray(parsedClients)) {
              parsedClients.forEach((cl: any) => {
                processRawData(cl[listBindConfig.targetFieldKey!]);
              });
            }
          }
        } catch {}

        if (collectedLabels.length === 0 && targetField?.defaultValue) {
          processRawData(targetField.defaultValue);
        }

        if (collectedLabels.length > 0) {
          const seen = new Set<string>();
          const opts: FieldOption[] = [];
          collectedLabels.forEach((label, idx) => {
            const clean = label.trim();
            if (clean && !seen.has(clean.toLowerCase())) {
              seen.add(clean.toLowerCase());
              opts.push({
                id: idx + 1,
                label: clean,
                value: clean.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                valueType: "text",
                index: idx + 1,
              });
            }
          });
          return { options: applySortOrder(opts, listConfig?.sortOrder), loading: false };
        }
        return { options: [], loading: false };
      }

      // 3. Table Column Binding
      if (listBindConfig.sourceType === "table" && listBindConfig.targetFieldKey) {
        const allFields = getAllFields("client");
        const tableField = allFields.find((f) => f.key === listBindConfig.targetFieldKey);
        const subFields = tableField?.subFields || (tableField?.tableColumns ? tableField.tableColumns.map(normalizeLegacyColumn).filter(Boolean) : []);
        const colId = listBindConfig.targetColumnOrSubFieldId || subFields[0]?.id;
        const collectedLabels: string[] = [];

        const processTableRows = (rowsData: any) => {
          if (!rowsData) return;
          let rows = rowsData;
          if (typeof rows === "string" && rows.trim()) {
            try { rows = JSON.parse(rows); } catch {}
          }
          if (Array.isArray(rows)) {
            rows.forEach((row) => {
              if (row && typeof row === "object") {
                const cellVal = row[colId] || row[subFields[0]?.id || ""] || row.name || row.label;
                if (cellVal && String(cellVal).trim()) collectedLabels.push(String(cellVal).trim());
              }
            });
          }
        };

        if (recordData) {
          processTableRows(recordData[listBindConfig.targetFieldKey]);
        }
        if (tableField && Array.isArray(tableField.defaultValue)) {
          processTableRows(tableField.defaultValue);
        }

        if (collectedLabels.length > 0) {
          const seen = new Set<string>();
          const opts: FieldOption[] = [];
          collectedLabels.forEach((label, idx) => {
            if (!seen.has(label.toLowerCase())) {
              seen.add(label.toLowerCase());
              opts.push({
                id: idx + 1,
                label,
                value: label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                valueType: "text",
                index: idx + 1,
              });
            }
          });
          return { options: applySortOrder(opts, listConfig?.sortOrder), loading: false };
        }
        return { options: [], loading: false };
      }

      // 4. Mirror from Another Field
      if (listBindConfig.sourceType === "field" && listBindConfig.targetFieldKey) {
        const allFields = getAllFields("client");
        const target = allFields.find((f) => f.key === listBindConfig.targetFieldKey);
        if (target && target.options && target.options.length > 0) {
          return { options: applySortOrder(target.options, listConfig?.sortOrder), loading: false };
        }
      }

      return { options: applySortOrder(baseOptions, listConfig?.sortOrder), loading: false };
    } catch {
      return { options: applySortOrder(baseOptions, listConfig?.sortOrder), loading: false };
    }
  }, [listBindConfig, staticOptions, recordData, listConfig, getAllFields, version]);

  return resolved;
}
