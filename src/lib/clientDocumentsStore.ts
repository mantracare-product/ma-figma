export interface StoredClientDocument {
  id: string;
  clientId: string;
  name: string;
  category: "Identification" | "Contract" | "Financial" | "Medical / Intake" | "General";
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

export function getStoredClientDocuments(clientId?: string): StoredClientDocument[] {
  try {
    const raw = sessionStorage.getItem("clientSavedDocuments");
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
  sessionStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
}

export function deleteClientDocument(docId: string): void {
  const current = getStoredClientDocuments();
  const updated = current.filter((d) => d.id !== docId);
  sessionStorage.setItem("clientSavedDocuments", JSON.stringify(updated));
  window.dispatchEvent(new Event(CLIENT_DOCUMENTS_EVENT));
}
