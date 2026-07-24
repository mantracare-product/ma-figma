/**
 * useKnowledgeBase.ts
 *
 * Shared accessor for the Process/Stage Knowledge Base.
 * This allows processChatRuntime.ts (and any future service) to query
 * KB sources for a given processId + stageId without importing from
 * the KnowledgeBase page component.
 *
 * The KnowledgeBase page saves sources to localStorage under the key
 * "globalKnowledgeSources" when available. This module reads from that key.
 * If the page hasn't persisted yet (first load) it falls back to the seed
 * data so the chat runtime always has *something* to query.
 */

const STORAGE_KEY = "globalKnowledgeSources";

export interface StoredKnowledgeSource {
  id: string;
  name: string;
  type: "text" | "document" | "url";
  title?: string;
  content?: string;
  tags: string[];
  scopes: Array<{ processId: string; stageIds: string[] }>;
  allProcesses: boolean;
  status: string;
  createdAt: string;
}

const FALLBACK_SOURCES: StoredKnowledgeSource[] = [
  {
    id: "src_fallback_1",
    name: "General FAQ",
    type: "text",
    title: "General FAQ",
    content: "Our office hours are Monday to Friday 9am–5pm. For emergencies, please call 911.",
    tags: ["FAQ"],
    scopes: [],
    allProcesses: true,
    status: "completed",
    createdAt: new Date().toISOString(),
  },
];

/**
 * Reads all stored knowledge sources from localStorage.
 */
export function getStoredKnowledgeSources(): StoredKnowledgeSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return FALLBACK_SOURCES;
}

/**
 * Saves knowledge sources to localStorage. Called by KnowledgeBase.tsx
 * whenever its `sources` state changes.
 */
export function saveKnowledgeSources(sources: StoredKnowledgeSource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {}
}

/**
 * Returns text-type knowledge sources applicable to a given processId + stageId.
 * Used by processChatRuntime.ts as the KB fallback for unanswered chat messages.
 *
 * Matching rules:
 *   1. allProcesses === true → always included
 *   2. scopes contains an entry where processId matches:
 *      - if stageIds is empty → all stages for that process included
 *      - if stageIds is non-empty → included only if stageId is listed
 */
export function getKnowledgeSourcesForStage(
  processId: string,
  stageId: string
): Array<{ title: string; content: string }> {
  const all = getStoredKnowledgeSources();
  return all
    .filter((src) => {
      if (src.type !== "text") return false;
      if (!src.content) return false;
      if (src.allProcesses) return true;
      return src.scopes.some((sc) => {
        if (sc.processId !== processId) return false;
        if (sc.stageIds.length === 0) return true;
        return sc.stageIds.includes(stageId);
      });
    })
    .map((src) => ({
      title: src.title || src.name,
      content: src.content!,
    }));
}
