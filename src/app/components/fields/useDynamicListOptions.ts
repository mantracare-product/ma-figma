import { useState, useEffect, useMemo } from "react";
import type { ListBindConfig, FieldOption, FieldDefinition, ListFieldConfig } from "../../context/FieldRegistryContext";
import { useFieldRegistry, normalizeLegacyColumn } from "../../context/FieldRegistryContext";
import { fetchCrmRecords } from "./useCrmBindOptions";
import { TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { CLIENTS_STORE_EVENT } from "../../../lib/clientProcessState";
import { PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";

export const RECORD_DATA_CHANGED_EVENT = "ma_record_data_changed";

const SKIP_KEYS = new Set(["id", "_id", "__type", "createdAt", "updatedAt"]);

/**
 * Robustly formats any value (string, object, array, JSON string) into a clean display label.
 */
export function formatEntryValue(item: any): string | null {
  if (item === undefined || item === null) return null;
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) return null;
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") return formatEntryValue(parsed);
      } catch {}
    }
    return trimmed;
  }
  if (Array.isArray(item)) {
    const subParts = item.map(formatEntryValue).filter(Boolean);
    return subParts.length > 0 ? subParts.join(", ") : null;
  }
  if (typeof item === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(item)) {
      if (SKIP_KEYS.has(k)) continue;
      const formatted = formatEntryValue(v);
      if (formatted && formatted !== "[object Object]") {
        parts.push(formatted);
      }
    }
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return String(item).trim() || null;
}

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
  }, [listBindConfig?.sourceType, listConfig?.liveLinkedFieldKey, listConfig?.inheritedFieldKey]);

  const resolved = useMemo(() => {
    // 1. Normalize static options so that composite object values become valid string values
    let baseOptions: FieldOption[] = staticOptions.map((opt, i) => {
      const stringValue =
        typeof opt.value === "object" && opt.value !== null
          ? (formatEntryValue(opt.value) || opt.label || String(opt.id || i + 1))
          : String(opt.value ?? opt.label ?? `opt_${i + 1}`);
      return {
        ...opt,
        value: stringValue,
        label: opt.label || stringValue,
      };
    });

    // 2. Live Two-Way Discovery Link Option
    const activeLiveKey = listConfig?.liveLinkedFieldKey || (listConfig?.inheritedFieldKey && (listConfig as any)?.liveSync ? listConfig.inheritedFieldKey : undefined);
    if (activeLiveKey) {
      const linkedKey = activeLiveKey;
      const discoveredValues: string[] = [];

      const processData = (rawData: any) => {
        if (rawData === undefined || rawData === null) return;
        let data = rawData;
        if (typeof data === "string" && data.trim()) {
          if ((data.trim().startsWith("[") && data.trim().endsWith("]")) || (data.trim().startsWith("{") && data.trim().endsWith("}"))) {
            try { data = JSON.parse(data); } catch {}
          }
        }
        if (Array.isArray(data)) {
          data.forEach((entry) => {
            const label = formatEntryValue(entry);
            if (label && label !== "[object Object]") discoveredValues.push(label);
          });
        } else if (data && typeof data === "object") {
          const label = formatEntryValue(data);
          if (label && label !== "[object Object]") discoveredValues.push(label);
        } else if (typeof data === "string" || typeof data === "number") {
          const label = String(data).trim();
          if (label) discoveredValues.push(label);
        }
      };

      // Scan in-memory active recordData
      if (recordData) {
        processData(recordData[linkedKey]);
        for (const [k, v] of Object.entries(recordData)) {
          if (k !== linkedKey && (k.endsWith(`_${linkedKey}`) || k.includes(linkedKey))) {
            processData(v);
          }
        }
      }

      // Scan sessionStorage records across common entities
      const storageKeys = ["clients", "processes", "services", "organizations", "team_members"];
      for (const sKey of storageKeys) {
        try {
          const raw = sessionStorage.getItem(sKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((rec: any) => {
                if (rec && typeof rec === "object") {
                  processData(rec[linkedKey]);
                  for (const [k, v] of Object.entries(rec)) {
                    if (k !== linkedKey && (k.endsWith(`_${linkedKey}`) || k.includes(linkedKey))) {
                      processData(v);
                    }
                  }
                }
              });
            }
          }
        } catch {}
      }

      // Check linked field definition's default value
      try {
        const allClientFields = getAllFields("client");
        const allProcessFields = getAllFields("process");
        const allFieldsList = [...allClientFields, ...allProcessFields];
        const linkedDef = allFieldsList.find((f) => f.key === linkedKey);
        if (linkedDef?.defaultValue) {
          processData(linkedDef.defaultValue);
        }
      } catch {}

      // Add discovered values that aren't already in baseOptions
      const existingValues = new Set(baseOptions.map((o) => String(o.value).toLowerCase()));
      const existingLabels = new Set(baseOptions.map((o) => String(o.label).toLowerCase()));

      discoveredValues.forEach((valStr) => {
        const cleanVal = valStr.trim();
        if (cleanVal && !existingValues.has(cleanVal.toLowerCase()) && !existingLabels.has(cleanVal.toLowerCase())) {
          baseOptions.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            label: cleanVal,
            value: cleanVal,
            valueType: "text",
            index: baseOptions.length + 1,
          });
          existingValues.add(cleanVal.toLowerCase());
          existingLabels.add(cleanVal.toLowerCase());
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
        const collectedLabels: string[] = [];

        const processRawData = (rawData: any) => {
          if (!rawData) return;
          let data = rawData;
          if (typeof data === "string" && data.trim()) {
            try { data = JSON.parse(data); } catch {}
          }
          if (Array.isArray(data)) {
            data.forEach((entry) => {
              const label = formatEntryValue(entry);
              if (label) collectedLabels.push(label);
            });
          } else if (data && typeof data === "object") {
            const label = formatEntryValue(data);
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
