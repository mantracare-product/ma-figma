import { useState, useEffect, useCallback } from "react";
import type { CrmBindConfig, CrmBindModule } from "../../context/FieldRegistryContext";
import { getStoredTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { getClientList } from "../../../lib/getClientList";
import { getStoredServices } from "../../../lib/servicesStore";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { CLIENTS_STORE_EVENT } from "../../../lib/clientProcessState";

export interface CrmOption {
  value: string;
  label: string;
  subtitle?: string;
}

// 5 Core Supported Modules for CRM Bind
export const CRM_MODULE_LABELS: Record<CrmBindModule, string> = {
  client: "Clients",
  call: "Call Logs",
  process: "Processes",
  appointment: "Appointments",
  service: "Services",
  invoice: "Invoices",
  claim: "Insurance Claims",
  organization: "Organizations",
  teamMember: "Team Members",
  scribe: "AI Scribe",
};

export const CRM_MODULE_DEFAULT_DISPLAY_FIELDS: Record<CrmBindModule, string[]> = {
  client: ["name", "email", "phone", "companyName", "status", "stage"],
  call: ["client", "caller", "duration", "outcome", "process", "date"],
  process: ["name", "category", "status", "stageCount"],
  appointment: ["title", "date", "status", "service", "doctorName", "clientName"],
  service: ["name", "price", "duration", "category"],
  invoice: ["invoiceNumber", "clientName", "amount", "status", "dueDate"],
  claim: ["claimNumber", "patientName", "serviceDate", "totalCharge", "status"],
  organization: ["name", "industry", "website", "location"],
  teamMember: ["name", "role", "email", "department"],
  scribe: ["sessionName", "patientName", "chiefComplaint", "diagnosis", "doctorName"],
};

export function fetchCrmRecords(module: CrmBindModule): any[] {
  try {
    switch (module) {
      case "teamMember":
        return getStoredTeamMembers();
      case "client":
        return getClientList();
      case "service": {
        const stored = getStoredServices();
        const storedNames = new Set(stored.map((s) => s.name.toLowerCase()));
        const extraMocks = MOCK_SERVICES.filter((m) => !storedNames.has(m.name.toLowerCase())).map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          price: m.price,
          tax: m.tax ?? 5,
          isActive: m.isActive,
        }));
        return [...stored, ...extraMocks];
      }
      case "process":
        return getStoredProcesses();
      case "organization": {
        const raw = localStorage.getItem("mantra_organizations_v1");
        return raw ? JSON.parse(raw) : [];
      }
      case "claim": {
        const raw = localStorage.getItem("mantra_claims_v1");
        return raw ? JSON.parse(raw) : [];
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export interface CrmBindFilterContext {
  drivingValue?: any;
  isDependent?: boolean;
}

export function useCrmBindOptions(
  config?: CrmBindConfig,
  filterContext?: CrmBindFilterContext
): {
  options: CrmOption[];
  loading: boolean;
  refresh: () => void;
} {
  const [options, setOptions] = useState<CrmOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadOptions = useCallback(() => {
    if (!config?.sourceModule) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const records = fetchCrmRecords(config.sourceModule);
    const displayField = config.displayField || "name";
    const secondaryField = config.secondaryDisplayField;
    const isStageDisplay = displayField === "stages" || displayField === "stage";

    // If this field is bound/dependent on a driving field (e.g. Process driving Stages)
    const isDependent = Boolean(filterContext?.isDependent);
    const drivingValRaw = filterContext?.drivingValue;
    const drivingValStr = drivingValRaw !== undefined && drivingValRaw !== null
      ? String(typeof drivingValRaw === "object" ? (drivingValRaw.name || drivingValRaw.id || "") : drivingValRaw).trim().toLowerCase()
      : "";

    // If dependent on a process and no driving value is selected yet in this row, return empty list
    if (isDependent && isStageDisplay && !drivingValStr) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const formatted: CrmOption[] = [];
    records.forEach((rec: any, idx: number) => {
      const id = String(rec.id ?? `rec-${idx}`);
      const rawVal = rec[displayField];

      // If user selected "stages" on process module, expand each stage as an individual selectable option
      if (isStageDisplay && Array.isArray(rec.stages)) {
        // When filtered by driving process, only include stages belonging to that process
        if (drivingValStr) {
          const recId = String(rec.id ?? "").toLowerCase();
          const recName = String(rec.name ?? "").toLowerCase();
          const matches =
            recId === drivingValStr ||
            recName === drivingValStr ||
            drivingValStr.includes(recName) ||
            recName.includes(drivingValStr);

          if (!matches) {
            return;
          }
        }

        rec.stages.forEach((stg: any, sIdx: number) => {
          const stgName = typeof stg === "object" && stg !== null ? (stg.name || stg.label || stg.title || `Stage ${sIdx + 1}`) : String(stg);
          const cleanLabel = drivingValStr || isDependent ? stgName : `${stgName} (${rec.name || "Process"})`;

          formatted.push({
            value: stgName,
            label: cleanLabel,
            subtitle: rec.name,
          });
        });
        return;
      }

      let label: string;
      if (Array.isArray(rawVal)) {
        label = rawVal
          .map((item) => (typeof item === "object" && item !== null ? (item.name || item.label || item.title || item.id || "") : String(item)))
          .filter(Boolean)
          .join(" → ");
      } else if (typeof rawVal === "object" && rawVal !== null) {
        label = rawVal.name || rawVal.label || rawVal.title || rawVal.id || "";
      } else {
        label = String(rawVal || rec.name || rec.title || id);
      }

      const subtitle = secondaryField && rec[secondaryField]
        ? String(rec[secondaryField])
        : rec.price !== undefined
        ? `$${rec.price}${rec.tax !== undefined ? ` · Tax: ${rec.tax}%` : ""}`
        : undefined;

      formatted.push({ value: id, label: label || id, subtitle });
    });

    setOptions(formatted);
    setLoading(false);
  }, [
    config?.sourceModule,
    config?.displayField,
    config?.secondaryDisplayField,
    filterContext?.drivingValue,
    filterContext?.isDependent,
  ]);

  useEffect(() => {
    loadOptions();

    if (!config?.sourceModule) return;

    // Verified event listeners for live sync across the 5 modules
    const handleEvent = () => {
      loadOptions();
    };

    const targetEventMap: Record<CrmBindModule, string> = {
      teamMember: TEAM_STORE_EVENT,
      client: CLIENTS_STORE_EVENT,
      process: PROCESS_STORE_EVENT,
      service: "ma_services_changed",
      organization: "organizationChanged",
      call: "ma_call_logs_changed",
      appointment: "ma_appointments_changed",
      invoice: "ma_invoices_changed",
      claim: "mantra_claims_changed",
      scribe: "ma_scribe_changed",
    };

    const evtName = targetEventMap[config.sourceModule];
    if (evtName) {
      window.addEventListener(evtName, handleEvent);
    }
    window.addEventListener("storage", handleEvent);

    return () => {
      if (evtName) {
        window.removeEventListener(evtName, handleEvent);
      }
      window.removeEventListener("storage", handleEvent);
    };
  }, [config?.sourceModule, loadOptions]);

  return { options, loading, refresh: loadOptions };
}
