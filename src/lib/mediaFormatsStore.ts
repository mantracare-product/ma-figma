/**
 * mediaFormatsStore.ts
 * Path: src/lib/mediaFormatsStore.ts
 *
 * Persistent store for media format extensions (Image, Document, Audio, Video, Any).
 * Manages default presets plus user-defined custom extensions stored in localStorage forever.
 */

export type MediaCategory = "image" | "document" | "audio" | "video" | "any";

export const DEFAULT_MEDIA_PRESETS: Record<MediaCategory, string[]> = {
  image: ["JPG", "JPEG", "PNG", "WEBP", "SVG", "GIF", "HEIC", "BMP", "TIFF"],
  document: ["PDF", "DOCX", "DOC", "XLSX", "XLS", "PPTX", "PPT", "TXT", "CSV", "RTF"],
  audio: ["MP3", "WAV", "AAC", "M4A", "OGG", "FLAC", "WMA", "AIFF"],
  video: ["MP4", "MOV", "AVI", "MKV", "WEBM", "WMV", "M4V"],
  any: ["PDF", "DOCX", "JPG", "PNG", "MP3", "MP4", "ZIP", "RAR", "7Z"],
};

export const MEDIA_FORMATS_STORAGE_KEY = "mantra_custom_media_formats_v1";
export const MEDIA_FORMATS_EVENT = "mantra_media_formats_updated";

export function cleanExtension(ext: string): string {
  if (!ext) return "";
  return ext
    .trim()
    .replace(/^[.\s/]+/, "")
    .replace(/[.\s/]+$/, "")
    .toUpperCase();
}

export function getCustomMediaFormats(): Record<MediaCategory, string[]> {
  if (typeof window === "undefined") {
    return { image: [], document: [], audio: [], video: [], any: [] };
  }
  try {
    const raw = localStorage.getItem(MEDIA_FORMATS_STORAGE_KEY);
    if (!raw) return { image: [], document: [], audio: [], video: [], any: [] };
    const parsed = JSON.parse(raw);
    return {
      image: Array.isArray(parsed.image) ? parsed.image.map(cleanExtension).filter(Boolean) : [],
      document: Array.isArray(parsed.document) ? parsed.document.map(cleanExtension).filter(Boolean) : [],
      audio: Array.isArray(parsed.audio) ? parsed.audio.map(cleanExtension).filter(Boolean) : [],
      video: Array.isArray(parsed.video) ? parsed.video.map(cleanExtension).filter(Boolean) : [],
      any: Array.isArray(parsed.any) ? parsed.any.map(cleanExtension).filter(Boolean) : [],
    };
  } catch (e) {
    console.warn("Failed to read custom media formats from localStorage:", e);
    return { image: [], document: [], audio: [], video: [], any: [] };
  }
}

export function getAllMediaFormats(category: MediaCategory = "document"): string[] {
  const defaults = DEFAULT_MEDIA_PRESETS[category] || DEFAULT_MEDIA_PRESETS.document;
  const customs = getCustomMediaFormats()[category] || [];

  const combined = [...defaults];
  customs.forEach((c) => {
    const clean = cleanExtension(c);
    if (clean && !combined.includes(clean)) {
      combined.push(clean);
    }
  });

  return combined;
}

export function addCustomMediaFormat(
  category: MediaCategory,
  rawExt: string
): { success: boolean; formatted: string; allFormats: string[]; message?: string } {
  const clean = cleanExtension(rawExt);
  if (!clean) {
    return { success: false, formatted: "", allFormats: getAllMediaFormats(category), message: "Extension cannot be empty" };
  }
  if (clean.length > 15) {
    return { success: false, formatted: clean, allFormats: getAllMediaFormats(category), message: "Extension is too long" };
  }

  const customMap = getCustomMediaFormats();
  const currentCustoms = customMap[category] || [];
  const defaults = DEFAULT_MEDIA_PRESETS[category] || [];

  if (!currentCustoms.includes(clean) && !defaults.includes(clean)) {
    const updatedCustoms = [...currentCustoms, clean];
    customMap[category] = updatedCustoms;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(MEDIA_FORMATS_STORAGE_KEY, JSON.stringify(customMap));
        window.dispatchEvent(new CustomEvent(MEDIA_FORMATS_EVENT, { detail: { category, added: clean } }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.warn("Failed to persist custom media format:", e);
      }
    }
  }

  return {
    success: true,
    formatted: clean,
    allFormats: getAllMediaFormats(category),
  };
}

export function removeCustomMediaFormat(category: MediaCategory, rawExt: string): string[] {
  const clean = cleanExtension(rawExt);
  const customMap = getCustomMediaFormats();
  const currentCustoms = customMap[category] || [];

  const updatedCustoms = currentCustoms.filter((c) => c !== clean);
  customMap[category] = updatedCustoms;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MEDIA_FORMATS_STORAGE_KEY, JSON.stringify(customMap));
      window.dispatchEvent(new CustomEvent(MEDIA_FORMATS_EVENT, { detail: { category, removed: clean } }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Failed to update custom media formats:", e);
    }
  }

  return getAllMediaFormats(category);
}

export function isCustomExtension(category: MediaCategory, ext: string): boolean {
  const clean = cleanExtension(ext);
  const defaults = DEFAULT_MEDIA_PRESETS[category] || [];
  return !defaults.includes(clean);
}
