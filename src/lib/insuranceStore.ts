// src/lib/insuranceStore.ts
// Store for client insurance records and available insurance providers

export interface ClientInsuranceRecord {
  id: string;
  uid: string;
  clientId?: string;
  clientName?: string;
  insuranceProvider: string;
  status: "active" | "no_expiry" | "expired";
  effectiveDate: string | null;
  expiryDate: string | null;
  policyNumber: string;
  groupNumber: string;
  planType: string;
  archived?: boolean;
}

const STORAGE_KEY = "client_insurance_records_v1";

const DEFAULT_RECORDS: ClientInsuranceRecord[] = [
  {
    id: "ins-1",
    uid: "174256",
    insuranceProvider: "MVP HEALTH CARE MEDICAID",
    status: "active",
    effectiveDate: "2024-01-01",
    expiryDate: null,
    policyNumber: "30880293243",
    groupNumber: "GRP-8819",
    planType: "COMMERCIAL",
    archived: false,
  },
  {
    id: "ins-2",
    uid: "284910",
    insuranceProvider: "Blue Cross Blue Shield",
    status: "active",
    effectiveDate: "2023-06-01",
    expiryDate: "2026-12-31",
    policyNumber: "BCBS-89421094",
    groupNumber: "GRP-4401",
    planType: "PPO",
    archived: false,
  },
  {
    id: "ins-3",
    uid: "391024",
    insuranceProvider: "Aetna Better Health",
    status: "active",
    effectiveDate: "2024-03-15",
    expiryDate: null,
    policyNumber: "AET-883011",
    groupNumber: "GRP-1029",
    planType: "HMO",
    archived: false,
  },
];

export function getStoredInsuranceRecords(clientId?: string): ClientInsuranceRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECORDS));
      return DEFAULT_RECORDS;
    }
    const list: ClientInsuranceRecord[] = JSON.parse(raw);
    if (clientId) {
      const filtered = list.filter((r) => !r.clientId || String(r.clientId) === String(clientId));
      return filtered.length > 0 ? filtered : list;
    }
    return list;
  } catch {
    return DEFAULT_RECORDS;
  }
}

export function saveStoredInsuranceRecords(records: ClientInsuranceRecord[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // noop
  }
}

export function addStoredInsuranceRecord(record: ClientInsuranceRecord): void {
  const current = getStoredInsuranceRecords();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];
  saveStoredInsuranceRecords(updated);
}
