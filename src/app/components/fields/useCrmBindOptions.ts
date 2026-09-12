import { useState, useEffect, useCallback } from "react";
import type { CrmBindConfig, CrmBindModule } from "../../context/FieldRegistryContext";
import { getStoredTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { getClientList } from "../../../lib/getClientList";
import { getStoredServices } from "../../../lib/servicesStore";
import { getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { CLIENTS_STORE_EVENT } from "../../../lib/clientProcessState";

export interface CrmOption {
  value: string;
  label: string;
  subtitle?: string;
}

// 5 Core Supported Modules for CRM Bind
export const CRM_MODULE_LABELS: Record<CrmBindModule, string> = {
  teamMember: "Team Members",
  client: "Clients",
  organization: "Organizations",
  service: "Services",
  process: "Processes",
};

export const CRM_MODULE_DEFAULT_DISPLAY_FIELDS: Record<CrmBindModule, string[]> = {
  teamMember: ["name", "email", "role"],
  client: ["name", "email", "phoneNumber"],
  organization: ["name", "industry", "email"],
  service: ["name", "category", "price"],
  process: ["name", "description"],
};

export function fetchCrmRecords(module: CrmBindModule): any[] {
  try {
    switch (module) {
      case "teamMember":
        return getStoredTeamMembers();
      case "client":
        return getClientList();
      case "service":
        return getStoredServices();
      case "process":
        return getStoredProcesses();
      case "organization": {
        const raw = localStorage.getItem("mantra_organizations_v1");
        return raw ? JSON.parse(raw) : [];
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export function useCrmBindOptions(config?: CrmBindConfig): {
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

    const formatted: CrmOption[] = records.map((rec: any, idx: number) => {
      const id = String(rec.id ?? `rec-${idx}`);
      const label = String(rec[displayField] || rec.name || rec.title || id);
      const subtitle = secondaryField && rec[secondaryField] ? String(rec[secondaryField]) : undefined;
      return { value: id, label, subtitle };
    });

    setOptions(formatted);
    setLoading(false);
  }, [config?.sourceModule, config?.displayField, config?.secondaryDisplayField]);

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
