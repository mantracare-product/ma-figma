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

  const isHtml = /<[a-z][\s\S]*>/i.test(mergedText);

  if (isHtml) {
    const container = document.createElement("div");
    container.style.width = `${contentWidth * 3.7795}px`;
    container.style.padding = "0px";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "13px";
    container.style.color = "#111827";
    container.style.lineHeight = "1.6";
    container.innerHTML = mergedText;
    document.body.appendChild(container);

    try {
      await doc.html(container, {
        x: margin,
        y: margin,
        width: contentWidth,
        windowWidth: contentWidth * 3.7795,
        autoPaging: "text",
      });
    } catch {
      // Clean text fallback
      const cleanText = container.innerText || container.textContent || mergedText;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      const lines = doc.splitTextToSize(cleanText, contentWidth);
      let y = margin;
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5.5;
      });
    } finally {
      document.body.removeChild(container);
    }
  } else {
    // Pure plain text template
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(mergedText, contentWidth);
    let y = margin;
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5.5;
    });
  }

  const blob = doc.output("blob");
  const dataUrl = doc.output("dataurlstring");
  const base64 = doc.output("datauristring");

  return { blob, dataUrl, base64 };
}
