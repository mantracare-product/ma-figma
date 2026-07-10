import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface CustomField {
  id: number;
  label: string;
  key: string;
  type: string; // "TEXT", "DROPDOWN", "DATE", "DATE_TIME", "NUMBER", "MONEY", "LINK", "WHATSAPP_LINK", "YES_NO"
  required: boolean;
  showAlways?: boolean;
  sourceFormId?: number;
}

export interface SystemField {
  key: string;
  label: string;
  inputType: "text" | "email" | "tel" | "select" | "textarea";
  placeholder: string;
  validation?: string;
  options?: { id: number; label: string; value: string }[];
}

export const CANONICAL_SYSTEM_FIELDS: SystemField[] = [
  { key: "name", label: "Name", inputType: "text", placeholder: "Full name", validation: "" },
  { key: "email", label: "Email", inputType: "email", placeholder: "email@example.com", validation: "email" },
  { key: "phone", label: "Phone", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone" },
  {
    key: "status", label: "Status", inputType: "select", placeholder: "Select status",
    options: [
      { id: 1, label: "Active", value: "active" },
      { id: 2, label: "Inactive", value: "inactive" },
      { id: 3, label: "Pending", value: "pending" },
    ]
  },
  { key: "location", label: "Location", inputType: "text", placeholder: "City, State or Address" },
  { key: "company", label: "Company", inputType: "text", placeholder: "Company name" },
  { key: "role", label: "Role", inputType: "text", placeholder: "Job title or role" },
  {
    key: "processes", label: "Processes", inputType: "select", placeholder: "Assign process",
    options: [
      { id: 1, label: "Patient Intake", value: "Patient Intake" },
      { id: 2, label: "Follow-up Calls", value: "Follow-up Calls" },
      { id: 3, label: "Billing Support", value: "Billing Support" },
      { id: 4, label: "Appointment Scheduling", value: "Appointment Scheduling" },
      { id: 5, label: "Insurance Verification", value: "Insurance Verification" },
    ]
  },
  { key: "language", label: "Language", inputType: "text", placeholder: "e.g. English, Spanish" },
  { key: "country", label: "Country", inputType: "text", placeholder: "e.g. United States" },
];

const INITIAL_CUSTOM_FIELDS: CustomField[] = [];

interface ClientFieldsContextValue {
  systemFields: SystemField[];
  customFieldsClients: CustomField[];
  setCustomFieldsClients: React.Dispatch<React.SetStateAction<CustomField[]>>;
  addCustomField: (field: Omit<CustomField, "id">) => CustomField;
}

const ClientFieldsContext = createContext<ClientFieldsContextValue | null>(null);

/** Keys that were hardcoded in the old INITIAL_CUSTOM_FIELDS seed. */
const STALE_SEED_KEYS = new Set(["patient_id", "insurance_provider", "appointment_date"]);

export function ClientFieldsProvider({ children }: { children: ReactNode }) {
  // ── One-time migration ────────────────────────────────────────────────────
  // If the _v2 flag is absent this session, strip any stale hardcoded seed
  // entries (identified by key + no sourceFormId) from the stored array so
  // they don't bleed through from older sessions. Runs synchronously here so
  // the useState initializer below always sees the cleaned value.
  if (!sessionStorage.getItem("clientCustomFields_v2")) {
    const raw = sessionStorage.getItem("clientCustomFields");
    if (raw) {
      try {
        const parsed: CustomField[] = JSON.parse(raw);
        // Keep only entries that are NOT the stale seed:
        //   a field is "stale seed" if its key is one of the old hardcoded keys
        //   AND it has no sourceFormId (i.e. wasn't created via FormBuilder/field picker).
        const cleaned = parsed.filter(
          (f) => !(STALE_SEED_KEYS.has(f.key) && f.sourceFormId === undefined)
        );
        sessionStorage.setItem("clientCustomFields", JSON.stringify(cleaned));
      } catch {
        // Corrupted value — just remove it and let the empty default take over.
        sessionStorage.removeItem("clientCustomFields");
      }
    }
    sessionStorage.setItem("clientCustomFields_v2", "true");
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [customFieldsClients, setCustomFieldsClients] = useState<CustomField[]>(() => {
    const saved = sessionStorage.getItem("clientCustomFields");
    return saved ? JSON.parse(saved) : INITIAL_CUSTOM_FIELDS;
  });

  useEffect(() => {
    sessionStorage.setItem("clientCustomFields", JSON.stringify(customFieldsClients));
  }, [customFieldsClients]);

  const addCustomField = (fieldData: Omit<CustomField, "id">): CustomField => {
    const newField: CustomField = {
      ...fieldData,
      id: Date.now(),
    };
    setCustomFieldsClients((prev) => [...prev, newField]);
    return newField;
  };

  return (
    <ClientFieldsContext.Provider
      value={{
        systemFields: CANONICAL_SYSTEM_FIELDS,
        customFieldsClients,
        setCustomFieldsClients,
        addCustomField,
      }}
    >
      {children}
    </ClientFieldsContext.Provider>
  );
}

export function useClientFields(): ClientFieldsContextValue {
  const ctx = useContext(ClientFieldsContext);
  if (!ctx) {
    throw new Error("useClientFields must be used within a ClientFieldsProvider");
  }
  return ctx;
}
