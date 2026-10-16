export interface StoredClientDocument {
  id: string;
  clientId: string;
  invoiceId?: string;
  appointmentId?: string;
  entityId?: string;
  entityType?: "client" | "process" | "appointment" | "invoice" | "claim";
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
  fieldValues?: Record<string, string>;
  rawDocxBase64?: string;
  pdfBase64?: string;
  pdfBlobUrl?: string;
}

export const CLIENT_DOCUMENTS_EVENT = "clientDocuments_updated";

export function getStoredClientDocuments(clientId?: string): StoredClientDocument[] {
  try {
    const raw = sessionStorage.getItem("clientSavedDocuments") || localStorage.getItem("clientSavedDocuments");
    const all: StoredClientDocument[] = raw ? JSON.parse(raw) : [];
    if (clientId) {
      return all.filter((d) => d.clientId === clientId);
    }
    return all;
  } catch {
    return [];
  }
}

export function saveClientDocument(doc: StoredClientDocument): void {
  const current = getStoredClientDocuments();
  const filtered = current.filter((d) => d.id !== doc.id);
  const updated = [doc, ...filtered];
  try {
    sessionStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
    localStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
  } catch {}
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
  window.dispatchEvent(new Event("storage"));
}

export function deleteClientDocument(docId: string): void {
  const current = getStoredClientDocuments();
  const updated = current.filter((d) => d.id !== docId);
  try {
    sessionStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
    localStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
  } catch {}
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
  window.dispatchEvent(new Event("storage"));
}
