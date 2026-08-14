export interface InvoiceDocumentRecord {
  id: string;
  invoiceId: string;
  name: string;
  kind: "generated" | "receipt";
  createdBy: string;
  createdAt: string; // ISO
}

const STORAGE_KEY = "invoice_documents_v1";

export function getInvoiceDocuments(invoiceId: string): InvoiceDocumentRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const all: InvoiceDocumentRecord[] = raw ? JSON.parse(raw) : [];
    return all
      .filter((d) => d.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function addInvoiceDocument(
  record: Omit<InvoiceDocumentRecord, "id" | "createdAt">
): InvoiceDocumentRecord {
  const doc: InvoiceDocumentRecord = {
    ...record,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const all: InvoiceDocumentRecord[] = raw ? JSON.parse(raw) : [];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...all, doc]));
  } catch {}
  return doc;
}

export function uploadInvoiceReceipt(
  invoiceId: string,
  fileName: string,
  createdBy = "Admin User"
): InvoiceDocumentRecord {
  return addInvoiceDocument({ invoiceId, name: fileName, kind: "receipt", createdBy });
}