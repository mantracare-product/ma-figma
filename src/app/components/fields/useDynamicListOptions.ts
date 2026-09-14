import { useState, useEffect, useMemo } from "react";
import type { ListBindConfig, FieldOption, FieldDefinition } from "../../context/FieldRegistryContext";
import { useFieldRegistry, normalizeLegacyColumn } from "../../context/FieldRegistryContext";
import { fetchCrmRecords } from "./useCrmBindOptions";
import { TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { CLIENTS_STORE_EVENT } from "../../../lib/clientProcessState";
import { PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";

export const RECORD_DATA_CHANGED_EVENT = "ma_record_data_changed";

export function useDynamicListOptions(
  listBindConfig?: ListBindConfig,
  staticOptions: FieldOption[] = [],
  recordData?: Record<string, any>
): { options: FieldOption[]; loading: boolean } {
  const { getAllFields } = useFieldRegistry();
  const [version, setVersion] = useState(0);

  // Re-fetch on storage, CRM, and record state change events
  useEffect(() => {
    if (!listBindConfig?.sourceType) return;

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
  }, [listBindConfig?.sourceType]);

  const resolved = useMemo(() => {
    if (!listBindConfig?.sourceType) {
      return { options: staticOptions, loading: false };
    }

    try {
      // 1. CRM Module Binding
      if (listBindConfig.sourceType === "crm" && listBindConfig.crmModule) {
        const records = fetchCrmRecords(listBindConfig.crmModule);
        const displayProp = listBindConfig.displayField || "name";
        const opts: FieldOption[] = records.map((rec: any, idx: number) => {
          const val = String(rec.id ?? `opt_${idx}`);
          const label = String(rec[displayProp] || rec.name || rec.title || val);
          return { id: idx + 1, label, value: val };
        });
        return { options: opts, loading: false };
      }

      // 2. Structured Open List Binding (or legacy group / group_repeatable)
      if (
        (listBindConfig.sourceType === "open_list" || listBindConfig.sourceType === "group") &&
        listBindConfig.targetFieldKey
      ) {
        const allFields = getAllFields("client");
        const targetField = allFields.find((f) => f.key === listBindConfig.targetFieldKey);

        // Keys to skip when building the joined label
        const SKIP_KEYS = new Set(["id", "_id", "__type"]);

        const collectedLabels: string[] = [];

        // Build a joined label from all non-empty sub-field values in one entry.
        const joinEntryValues = (item: any): string | null => {
          if (!item) return null;

          // Unwrap JSON strings
          if (typeof item === "string") {
            try {
              const parsed = JSON.parse(item);
              if (parsed && typeof parsed === "object") return joinEntryValues(parsed);
            } catch { }
            return item.trim() || null; // plain string entry
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
            try { data = JSON.parse(data); } catch { }
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

        // 1. PRIMARY SOURCE: Active in-memory recordData (live user typing)
        if (recordData) {
          processRawData(recordData[listBindConfig.targetFieldKey]);
          for (const [k, v] of Object.entries(recordData)) {
            if (k.endsWith(`_${listBindConfig.targetFieldKey}`) || k === listBindConfig.targetFieldKey) {
              processRawData(v);
            }
          }
        }

        // 2. SECONDARY SOURCE: Stored client records in sessionStorage
        try {
          const rawClients = sessionStorage.getItem("clients");
          if (rawClients) {
            const parsedClients = JSON.parse(rawClients);
            if (Array.isArray(parsedClients)) {
              parsedClients.forEach((cl: any) => {
                processRawData(cl[listBindConfig.targetFieldKey!]);
                for (const [k, v] of Object.entries(cl)) {
                  if (k.endsWith(`_${listBindConfig.targetFieldKey}`) || k === listBindConfig.targetFieldKey!) {
                    processRawData(v);
                  }
                }
              });
            }
          }
        } catch { }

        // 3. TERTIARY SOURCE: Schema default value
        if (collectedLabels.length === 0 && targetField?.defaultValue) {
          processRawData(targetField.defaultValue);
        }

        // Format collected labels as options
        if (collectedLabels.length > 0) {
          const opts: FieldOption[] = collectedLabels.map((label, idx) => ({
            id: idx + 1,
            label,
            value: label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
          }));
          return { options: opts, loading: false };
        }

        // No entries yet — return empty (do NOT fall back to seed options)
        return { options: [], loading: false };
      }

      // 3. Table Field Column Binding
      if (listBindConfig.sourceType === "table" && listBindConfig.targetFieldKey) {
        const allFields = getAllFields("client");
        const tableField = allFields.find((f) => f.key === listBindConfig.targetFieldKey);

        // Keys to skip when building the joined label
        const SKIP_KEYS = new Set(["id", "_id", "__type"]);

        const collectedLabels: string[] = [];

        // Join all column values in a row into one label
        const joinRowValues = (row: any): string | null => {
          if (!row || typeof row !== "object") return null;
          const parts: string[] = [];
          for (const [k, v] of Object.entries(row)) {
            if (SKIP_KEYS.has(k)) continue;
            const sv = String(v ?? "").trim();
            if (sv && sv !== "[object Object]") parts.push(sv);
          }
          return parts.length > 0 ? parts.join(", ") : null;
        };

        const processTableRows = (rows: any) => {
          if (!rows) return;
          let parsedRows = rows;
          if (typeof rows === "string" && rows.trim()) {
            try { parsedRows = JSON.parse(rows); } catch { }
          }
          if (Array.isArray(parsedRows)) {
            parsedRows.forEach((row: any) => {
              const label = joinRowValues(row);
              if (label) collectedLabels.push(label);
            });
          }
        };

        // Live in-memory recordData
        if (recordData) {
          processTableRows(recordData[listBindConfig.targetFieldKey]);
          for (const [k, v] of Object.entries(recordData)) {
            if (k.endsWith(`_${listBindConfig.targetFieldKey}`)) {
              processTableRows(v);
            }
          }
        }

        // Check defaultValue rows in field schema
        if (tableField && Array.isArray(tableField.defaultValue)) {
          processTableRows(tableField.defaultValue);
        }

        // Also check if any stored client records have data for this table
        try {
          const rawClients = sessionStorage.getItem("clients");
          if (rawClients) {
            const parsedClients = JSON.parse(rawClients);
            if (Array.isArray(parsedClients)) {
              parsedClients.forEach((cl: any) => {
                processTableRows(cl[listBindConfig.targetFieldKey!]);
                for (const [k, v] of Object.entries(cl)) {
                  if (k.endsWith(`_${listBindConfig.targetFieldKey}`)) {
                    processTableRows(v);
                  }
                }
              });
            }
          }
        } catch { }

        // Format collected row labels as options
        if (collectedLabels.length > 0) {
          const opts: FieldOption[] = collectedLabels.map((label, idx) => ({
            id: idx + 1,
            label,
            value: label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
          }));
          return { options: opts, loading: false };
        }

        // No rows yet — return empty
        return { options: [], loading: false };
      }

      // 4. Mirror from Another Custom Field
      if (listBindConfig.sourceType === "field" && listBindConfig.targetFieldKey) {
        const allFields = getAllFields("client");
        const target = allFields.find((f) => f.key === listBindConfig.targetFieldKey);
        if (target && target.options && target.options.length > 0) {
          return { options: target.options, loading: false };
        }
      }

      return { options: staticOptions, loading: false };
    } catch {
      return { options: staticOptions, loading: false };
    }
  }, [listBindConfig, staticOptions, recordData, getAllFields, version]);

  return resolved;
}
