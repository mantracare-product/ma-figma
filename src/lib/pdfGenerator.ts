import { jsPDF } from "jspdf";
import { DocumentTemplate } from "./documentTemplatesStore";

export interface GeneratedPdfResult {
  blob: Blob;
  dataUrl: string;
  base64: string;
}

export interface PdfClientInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobPosition?: string;
  location?: string;
  responsible?: string;
  status?: string;
}

export async function generateClientPdf(
  template: DocumentTemplate,
  mergedText: string,
  client: PdfClientInfo
): Promise<GeneratedPdfResult> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(31, 41, 55); // #1F2937 Dark navy
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MANTRACARE HEALTHCARE CRM", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Official Client Record & Document Services", margin, 18);

  // Right side header metadata
  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const docIdStr = `DOC-${Date.now().toString().slice(-6)}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Doc ID: ${docIdStr}`, pageWidth - margin, 12, { align: "right" });
  doc.text(`Date: ${todayStr}`, pageWidth - margin, 18, { align: "right" });

  let y = 32;

  // Document Title Banner
  doc.setFillColor(243, 244, 246); // #F3F4F6
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");

  doc.setTextColor(17, 24, 39); // #111827
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(template.name, pageWidth / 2, y + 8, { align: "center" });

  y += 18;

  // Client Details Box
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);

  // Left col
  doc.setFont("helvetica", "bold");
  doc.text("Client Name:", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(client.name || "N/A", margin + 24, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Email:", margin + 4, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(client.email || "N/A", margin + 24, y + 12);

  doc.setFont("helvetica", "bold");
  doc.text("Phone:", margin + 4, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(client.phone || "—", margin + 24, y + 17);

  // Right col
  const midX = margin + contentWidth / 2;
  doc.setFont("helvetica", "bold");
  doc.text("Company:", midX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(client.companyName || "N/A", midX + 20, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Location:", midX, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(client.location || "N/A", midX + 20, y + 12);

  doc.setFont("helvetica", "bold");
  doc.text("Officer:", midX, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(client.responsible || "Staff Member", midX + 20, y + 17);

  y += 28;

  // Body Text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);

  const lines = doc.splitTextToSize(mergedText, contentWidth);
  const lineHeight = 5.2;

  lines.forEach((line: string) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      // Draw minimal header for page 2+
      doc.setFillColor(31, 41, 55);
      doc.rect(0, 0, pageWidth, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${template.name} — Page ${doc.getNumberOfPages()}`, margin, 7);

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      y = 18;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated for ${client.name} (${client.email}) • MantraCare CRM System`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  const blob = doc.output("blob");
  const dataUrl = doc.output("dataurlstring");
  const base64 = doc.output("datauristring");

  return { blob, dataUrl, base64 };
}
