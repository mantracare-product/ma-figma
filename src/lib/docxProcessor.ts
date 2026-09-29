import JSZip from "jszip";
import mammoth from "mammoth";
import { DocumentTemplateFieldMapping } from "./documentTemplatesStore";

/**
 * Replace placeholders inside raw docx XML while preserving all formatting,
 * tables, fonts, headers, footers, and styles of the original Word document.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    if (!base64 || typeof base64 !== "string") return new ArrayBuffer(0);
    // Strip potential data URL prefix
    const cleanB64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binaryString = window.atob(cleanB64.replace(/\s/g, ""));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("base64ToArrayBuffer error:", e);
    return new ArrayBuffer(0);
  }
}

/**
 * Replace placeholders inside raw docx XML while preserving all formatting,
 * tables, fonts, headers, footers, and styles of the original Word document.
 */
export async function generatePopulatedDocx(
  rawDocxBase64OrBuffer: string | ArrayBuffer,
  fieldValues: Record<string, string>,
  fieldMappings?: DocumentTemplateFieldMapping[]
): Promise<Blob> {
  let arrayBuffer: ArrayBuffer;
  if (typeof rawDocxBase64OrBuffer === "string") {
    arrayBuffer = base64ToArrayBuffer(rawDocxBase64OrBuffer);
  } else {
    arrayBuffer = rawDocxBase64OrBuffer;
  }

  const zip = await JSZip.loadAsync(arrayBuffer);

  // Build replacement map (lowercase and raw keys)
  const replacementMap: Record<string, string> = { ...fieldValues };
  if (fieldMappings) {
    fieldMappings.forEach((m) => {
      const val = fieldValues[m.templateField] || fieldValues[m.mappedFieldKey];
      if (val !== undefined) {
        replacementMap[m.templateField] = val;
        replacementMap[m.mappedFieldKey] = val;
      }
    });
  }

  // Target all XML files inside the docx container that may hold text
  const xmlFilePaths = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith("word/") &&
      (name.endsWith(".xml") || name.endsWith(".xml.rels"))
  );

  for (const path of xmlFilePaths) {
    const file = zip.file(path);
    if (!file) continue;

    let content = await file.async("string");

    // 1. First pass: Replace contiguous placeholders {key}, {{key}}, [key], «key»
    Object.keys(replacementMap).forEach((key) => {
      const val = escapeXml(replacementMap[key] || "");
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      content = content.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "gi"), val);
      content = content.replace(new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, "gi"), val);
      content = content.replace(new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, "gi"), val);
      content = content.replace(new RegExp(`«\\s*${escapedKey}\\s*»`, "gi"), val);
    });

    // 2. Second pass: Handle Word's cross-run splitting inside paragraphs (<w:p>)
    content = replaceSplitXmlPlaceholders(content, replacementMap);

    // Save updated XML back to the ZIP
    zip.file(path, content);
  }

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Handle Word splitting a single token like {name} into multiple <w:t> tags
 * e.g. <w:t>{</w:t></w:r><w:r><w:t>name</w:t></w:r><w:r><w:t>}</w:t>
 */
function replaceSplitXmlPlaceholders(
  xmlContent: string,
  replacementMap: Record<string, string>
): string {
  // Regex to inspect each paragraph <w:p>...</w:p>
  return xmlContent.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    let modifiedParagraph = paragraphXml;

    // Check if paragraph contains any placeholder open characters
    if (
      !modifiedParagraph.includes("{") &&
      !modifiedParagraph.includes("«") &&
      !modifiedParagraph.includes("[")
    ) {
      return modifiedParagraph;
    }

    Object.keys(replacementMap).forEach((key) => {
      const val = escapeXml(replacementMap[key] || "");
      const keyPattern = key.split("").map((c) => escapeRegex(c)).join("(?:<[^>]+>)*");

      // 1. Single curly: {key}
      const singleCurlyRegex = new RegExp(`\\{(?:<[^>]+>)*${keyPattern}(?:<[^>]+>)*\\}`, "gi");
      if (singleCurlyRegex.test(modifiedParagraph)) {
        modifiedParagraph = modifiedParagraph.replace(singleCurlyRegex, val);
      }

      // 2. Double curly: {{key}}
      const doubleCurlyRegex = new RegExp(`\\{\\{(?:<[^>]+>)*${keyPattern}(?:<[^>]+>)*\\}\\}`, "gi");
      if (doubleCurlyRegex.test(modifiedParagraph)) {
        modifiedParagraph = modifiedParagraph.replace(doubleCurlyRegex, val);
      }

      // 3. Square brackets: [key]
      const bracketRegex = new RegExp(`\\[(?:<[^>]+>)*${keyPattern}(?:<[^>]+>)*\\]`, "gi");
      if (bracketRegex.test(modifiedParagraph)) {
        modifiedParagraph = modifiedParagraph.replace(bracketRegex, val);
      }

      // 4. Guillemets: «key»
      const guillemetsRegex = new RegExp(`«(?:<[^>]+>)*${keyPattern}(?:<[^>]+>)*»`, "gi");
      if (guillemetsRegex.test(modifiedParagraph)) {
        modifiedParagraph = modifiedParagraph.replace(guillemetsRegex, val);
      }
    });

    return modifiedParagraph;
  });
}

function escapeXml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract HTML from Word document arrayBuffer with full style preserving
 */
export async function convertDocxToPreviewHtml(arrayBuffer: ArrayBuffer): Promise<{
  html: string;
  rawText: string;
}> {
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1.doc-title:fresh",
      "p[style-name='Subtitle'] => p.subtitle:fresh",
      "table => table.doc-table:fresh",
    ],
  };

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, options);
  const textResult = await mammoth.extractRawText({ arrayBuffer });

  return {
    html: htmlResult.value,
    rawText: textResult.value,
  };
}
