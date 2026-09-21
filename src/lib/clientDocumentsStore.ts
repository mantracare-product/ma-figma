import { broadcastSync, onSyncEvent } from "./syncBroadcast";

export interface StoredClientDocument {
  id: string;
  clientId: string;
  name: string;
  category: string;
  valueBy?: string;
  fileType: "pdf" | "doc" | "sheet" | "image";
  fileSize: string;
  uploadedDate: string;
  uploadedBy: string;
  status: "Verified" | "Pending Review" | "Rejected";
  notes?: string;
  templateId?: string;
  generatedContent?: string;
  pdfBase64?: string;
  pdfBlobUrl?: string;
}

export const CLIENT_DOCUMENTS_EVENT = "clientDocuments_updated";

if (typeof window !== "undefined") {
  onSyncEvent("DOCUMENTS_UPDATED", () => {
    window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
  });
}

export const DEFAULT_OPHTHALMIC_DOCUMENTS: StoredClientDocument[] = [
  {
    id: "rx-001",
    clientId: "CL-001",
    name: "Nuclear Cataract Grade II (Right Eye)",
    category: "Prescription",
    fileType: "pdf",
    fileSize: "420 KB",
    uploadedDate: "2026-08-24",
    uploadedBy: "Dr. Meera Nair",
    status: "Verified",
    notes: "Dr. Meera Nair · RX-001",
    generatedContent: "EYEMANTRA\nPRESCRIPTION & CLINICAL ASSESSMENT (RX-001)\n\nPatient: Ramesh Iyer (62 / M) | MRN: MRN-84920\nSurgeon: Dr. Meera Nair, Ophthalmologist\nDate: Aug 24, 2026\n\nDiagnosis: Nuclear Cataract Grade II (Right Eye, OD)\nPlan: Cataract Surgery Daycare with Foldable Toric IOL\n\nMedications:\n1. Moxifloxacin 0.5% Eye Drops — 1 drop 4 times daily\n2. Carboxymethylcellulose 1% Lubricant — 1 drop 3 times daily\n\nVerified by Dr. Meera Nair",
  },
];

const STORAGE_KEY = "clientSavedDocuments_v3";

export function getStoredClientDocuments(clientId?: string): StoredClientDocument[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_OPHTHALMIC_DOCUMENTS));
      if (clientId) {
        return DEFAULT_OPHTHALMIC_DOCUMENTS.filter((d) => d.clientId === clientId);
      }
      return DEFAULT_OPHTHALMIC_DOCUMENTS;
    }
    const all: StoredClientDocument[] = JSON.parse(raw);
    if (clientId) {
      return all.filter((d) => d.clientId === clientId);
    }
    return all;
  } catch {
    return DEFAULT_OPHTHALMIC_DOCUMENTS;
  }
}

export function saveClientDocument(doc: StoredClientDocument): void {
  const current = getStoredClientDocuments();
  const filtered = current.filter((d) => d.id !== doc.id);
  const updated = [doc, ...filtered];
  const serialized = JSON.stringify(updated);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {}
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
  broadcastSync("DOCUMENTS_UPDATED", doc);
}

export function deleteClientDocument(docId: string): void {
  const current = getStoredClientDocuments();
  const updated = current.filter((d) => d.id !== docId);
  const serialized = JSON.stringify(updated);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {}
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
  broadcastSync("DOCUMENTS_UPDATED", { deletedId: docId });
}
