import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type FieldModule = "client" | "process" | "appointment" | "call" | "service" | "organization" | "deal" | "teamMember";

export type FieldInputType = "text" | "email" | "tel" | "select" | "multiselect" | "textarea" | "date"
  | "date_time" | "number" | "money" | "link" | "whatsapp_link" | "yes_no";

export interface FieldOption { id: number; label: string; value: string; }

export interface FieldDefinition {
  id: number;               // stable numeric/uuid id
  key: string;               // stable machine key, used in {{key}} variables
  label: string;              // display name
  module: FieldModule;        // which entity this field belongs to
  source: "system" | "custom";
  inputType: FieldInputType;
  placeholder?: string;
  validation?: string;
  options?: FieldOption[];    // for select/dropdown types
  required?: boolean;
  showAlways?: boolean;       // legacy — kept for backward compat, do not write for new fields
  /** Record IDs this field is auto-shown on. If empty or undefined, it defaults to showing for all records. */
  visibleToRecordIds?: string[];
  sourceFormId?: number;      // if created via a WebForm field, provenance
  createdAt: number;
}

/**
 * Resolve the effective auto-display visibility of a field.
 * - If visibleToRecordIds has one or more IDs, visibility is "specific".
 * - Otherwise, it is "all" (auto-shows on every record).
 */
export function resolveVisibility(f: FieldDefinition): "none" | "all" | "specific" {
  if (f.visibleToRecordIds && f.visibleToRecordIds.length > 0) {
    return "specific";
  }
  return "all";
}



export const SYSTEM_SEEDS: Record<Exclude<FieldModule, "deal">, Omit<FieldDefinition, "id" | "source" | "createdAt">[]> = {
  client: [
    { key: "name", label: "Name", module: "client", inputType: "text", placeholder: "Full name", showAlways: true },
    {
      key: "status", label: "Status", module: "client", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Active", value: "active" },
        { id: 2, label: "Inactive", value: "inactive" },
        { id: 3, label: "Pending", value: "pending" },
      ]
    },
    {
      key: "processes", label: "Processes", module: "client", inputType: "select", placeholder: "Assign process", showAlways: true,
      options: [
        { id: 1, label: "Patient Intake", value: "Patient Intake" },
        { id: 2, label: "Follow-up Calls", value: "Follow-up Calls" },
        { id: 3, label: "Billing Support", value: "Billing Support" },
        { id: 4, label: "Appointment Scheduling", value: "Appointment Scheduling" },
        { id: 5, label: "Insurance Verification", value: "Insurance Verification" },
      ]
    },
    { key: "email", label: "Email", module: "client", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "client", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "location", label: "Location", module: "client", inputType: "text", placeholder: "City, State or Address", showAlways: true },
    { key: "company", label: "Company", module: "client", inputType: "text", placeholder: "Company name", showAlways: true },
    { key: "role", label: "Role", module: "client", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "language", label: "Language", module: "client", inputType: "text", placeholder: "e.g. English", showAlways: true },
    { key: "country", label: "Country", module: "client", inputType: "text", placeholder: "e.g. United States", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "client", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  process: [
    { key: "process_name", label: "Process Name", module: "process", inputType: "text", placeholder: "Process name", showAlways: true },
    { key: "stage", label: "Stage", module: "process", inputType: "text", placeholder: "Stage", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "process", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  appointment: [
    { key: "appointment_date", label: "Appointment Date", module: "appointment", inputType: "date", showAlways: true },
    { key: "appointment_time", label: "Appointment Time", module: "appointment", inputType: "text", placeholder: "HH:MM", showAlways: true },
    {
      key: "appointment_type", label: "Appointment Type", module: "appointment", inputType: "select", placeholder: "Select type", showAlways: true,
      options: [
        { id: 1, label: "Video Call", value: "video" },
        { id: 2, label: "In-Person", value: "in-person" },
      ]
    },
    {
      key: "status", label: "Status", module: "appointment", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Scheduled", value: "scheduled" },
        { id: 2, label: "Completed", value: "completed" },
        { id: 3, label: "Cancelled", value: "cancelled" },
        { id: 4, label: "No-Show", value: "no-show" },
        { id: 5, label: "Pending Accept", value: "pending-accept" },
      ]
    },
    { key: "provider", label: "Provider", module: "appointment", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  call: [
    { key: "status", label: "Call Status", module: "call", inputType: "text", placeholder: "Completed/Missed", showAlways: true },
    { key: "duration", label: "Duration", module: "call", inputType: "text", placeholder: "Duration", showAlways: true },
    { key: "call_sentiment", label: "Sentiment", module: "call", inputType: "text", placeholder: "Sentiment", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "call", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  service: [
    { key: "service_name", label: "Service Name", module: "service", inputType: "text", placeholder: "Service name", showAlways: true },
    { key: "price", label: "Price", module: "service", inputType: "number", placeholder: "Price", showAlways: true },
  ],
  organization: [
    { key: "org_name", label: "Organization Name", module: "organization", inputType: "text", placeholder: "Org Name", showAlways: true },
    { key: "industry", label: "Industry", module: "organization", inputType: "text", placeholder: "Industry", showAlways: true },
  ],
  teamMember: [
    { key: "name", label: "Name", module: "teamMember", inputType: "text", placeholder: "Full name", showAlways: true },
    { key: "email", label: "Email", module: "teamMember", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "teamMember", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "role", label: "Role", module: "teamMember", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "assigned_service", label: "Assigned Service", module: "teamMember", inputType: "text", placeholder: "Assigned service", showAlways: true },
    { key: "next_available_slot", label: "Next Available Slot", module: "teamMember", inputType: "text", placeholder: "Next slot", showAlways: true },
  ],
};

export function getLiveTeamMembers() {
  const list = new Set<string>();
  
  // Try loading from settings_allUsers
  try {
    const raw = sessionStorage.getItem("settings_allUsers");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Try loading from userManagement_users
  try {
    const raw = sessionStorage.getItem("userManagement_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Fallbacks
  const fallbacks = [
    "John Smith",
    "Sarah Johnson",
    "Emily Davis",
    "Dr. Robert Martinez",
    "Lisa Anderson",
    "Admin User",
    "Sarah Manager",
    "John Agent"
  ];
  fallbacks.forEach(name => list.add(name));

  return Array.from(list).map((name, idx) => ({
    id: idx + 1,
    label: name,
    value: name
  }));
}

interface FieldRegistryContextValue {
  getSystemFields: (module: FieldModule) => FieldDefinition[];
  getCustomFields: (module: FieldModule) => FieldDefinition[];
  getAllFields: (module: FieldModule) => FieldDefinition[];
  addCustomField: (module: FieldModule, field: Omit<FieldDefinition, "id" | "source" | "createdAt">) => FieldDefinition;
  updateCustomField: (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => void;
  deleteCustomField: (module: FieldModule, id: number) => void;
}

const FieldRegistryContext = createContext<FieldRegistryContextValue | null>(null);

export function FieldRegistryProvider({ children }: { children: ReactNode }) {
  const [customFields, setCustomFields] = useState<Record<Exclude<FieldModule, "deal">, FieldDefinition[]>>(() => {
    const saved = sessionStorage.getItem("fieldRegistry_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize any old "deal" custom fields to "process" if present
        if (parsed.deal && !parsed.process) {
          parsed.process = parsed.deal;
          delete parsed.deal;
        }
        return parsed;
      } catch (e) {
        console.error("Error parsing fieldRegistry_v1", e);
      }
    }
    
    // Migration from clientCustomFields
    const oldClientFieldsRaw = sessionStorage.getItem("clientCustomFields");
    let initialClientCustom: FieldDefinition[] = [];
    if (oldClientFieldsRaw) {
      try {
        const parsed = JSON.parse(oldClientFieldsRaw);
        initialClientCustom = parsed.map((f: any) => ({
          id: f.id || Date.now(),
          key: f.key || f.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          label: f.label,
          module: "client",
          source: "custom",
          inputType: (f.type ? f.type.toLowerCase() : "text") as FieldInputType,
          required: f.required || false,
          showAlways: f.showAlways !== false,
          sourceFormId: f.sourceFormId,
          createdAt: f.id || Date.now(),
        }));
      } catch {
        // noop
      }
    }
    return {
      client: initialClientCustom,
      process: [],
      appointment: [],
      call: [],
      service: [],
      organization: [],
    };
  });

  useEffect(() => {
    sessionStorage.setItem("fieldRegistry_v1", JSON.stringify(customFields));
  }, [customFields]);

  const normalizeModule = (module: FieldModule): Exclude<FieldModule, "deal"> => {
    return module === "deal" ? "process" : module;
  };

  const getSystemFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    const seeds = SYSTEM_SEEDS[norm] || [];
    const teamOptions = getLiveTeamMembers();

    return seeds.map((f, index) => {
      // Sourced live team options for "responsible" or "provider" select inputs
      const isTeamSelect = f.key === "responsible" || f.key === "provider";
      return {
        ...f,
        id: -(index + 1), // system fields have negative ids
        source: "system",
        createdAt: 0,
        options: isTeamSelect ? teamOptions : f.options,
      };
    }) as FieldDefinition[];
  };

  const getCustomFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    return customFields[norm] || [];
  };

  const getAllFields = (module: FieldModule): FieldDefinition[] => {
    return [...getSystemFields(module), ...getCustomFields(module)];
  };

  const addCustomField = (
    module: FieldModule,
    fieldData: Omit<FieldDefinition, "id" | "source" | "createdAt">
  ): FieldDefinition => {
    const norm = normalizeModule(module);
    const newField: FieldDefinition = {
      ...fieldData,
      module: norm,
      id: Date.now() + Math.floor(Math.random() * 1000),
      source: "custom",
      createdAt: Date.now(),
    };
    setCustomFields((prev) => ({
      ...prev,
      [norm]: [...(prev[norm] || []), newField],
    }));
    return newField;
  };

  const updateCustomField = (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => {
    const norm = normalizeModule(module);
    setCustomFields((prev) => {
      const updated = (prev[norm] || []).map((f) =>
        f.id === id ? { ...f, ...patch } : f
      );
      return {
        ...prev,
        [norm]: updated,
      };
    });
  };

  const deleteCustomField = (module: FieldModule, id: number) => {
    const norm = normalizeModule(module);
    setCustomFields((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).filter((f) => f.id !== id),
    }));
  };

  return (
    <FieldRegistryContext.Provider
      value={{
        getSystemFields,
        getCustomFields,
        getAllFields,
        addCustomField,
        updateCustomField,
        deleteCustomField,
      }}
    >
      {children}
    </FieldRegistryContext.Provider>
  );
}

export function useFieldRegistry(): FieldRegistryContextValue {
  const ctx = useContext(FieldRegistryContext);
  if (!ctx) {
    throw new Error("useFieldRegistry must be used within a FieldRegistryProvider");
  }
  return ctx;
}
