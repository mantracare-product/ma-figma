import React, { type ReactNode } from "react";
import { useFieldRegistry } from "./FieldRegistryContext";

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

export function ClientFieldsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useClientFields() {
  const { getSystemFields, getCustomFields, addCustomField } = useFieldRegistry();

  const clientSys = getSystemFields("client");
  const clientCust = getCustomFields("client");

  // Map to shim structure
  const systemFields: SystemField[] = clientSys.map(f => ({
    key: f.key,
    label: f.label,
    inputType: (f.inputType === "email" || f.inputType === "tel" || f.inputType === "select" || f.inputType === "textarea") ? f.inputType : "text",
    placeholder: f.placeholder || "",
    validation: f.validation,
    options: f.options,
  }));

  const customFieldsClients: CustomField[] = clientCust.map(f => ({
    id: f.id,
    label: f.label,
    key: f.key,
    type: f.inputType.toUpperCase(),
    required: f.required || false,
    showAlways: f.showAlways,
    sourceFormId: f.sourceFormId,
  }));

  const addCustomFieldShim = (fieldData: Omit<CustomField, "id">): CustomField => {
    const created = addCustomField("client", {
      key: fieldData.key,
      label: fieldData.label,
      module: "client" as const,
      inputType: (fieldData.type.toLowerCase()) as any,
      required: fieldData.required,
      showAlways: fieldData.showAlways,
      sourceFormId: fieldData.sourceFormId,
      options: [],
    });
    return {
      id: created.id,
      label: created.label,
      key: created.key,
      type: created.inputType.toUpperCase(),
      required: created.required || false,
      showAlways: created.showAlways,
      sourceFormId: created.sourceFormId,
    };
  };

  return {
    systemFields,
    customFieldsClients,
    setCustomFieldsClients: () => {}, // no-op since it's driven by add/delete in registry
    addCustomField: addCustomFieldShim,
  };
}
