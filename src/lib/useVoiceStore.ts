export interface VoiceConfigItem {
  id: number;
  name: string;
  gender: string;
  language: string;
  accent: string;
  country: string;
  tone: string;
  age: string;
  provider?: string;
  processes: string[];
  status: boolean;
}

export const DEFAULT_VOICE_TABLE_DATA: VoiceConfigItem[] = [
  { id: 1, name: "Nova", gender: "Female", language: "English", accent: "American", country: "USA", tone: "Professional", age: "Young", provider: "OpenAI", processes: ["Insurance Verification"], status: true },
  { id: 2, name: "Atlas", gender: "Male", language: "English", accent: "British", country: "UK", tone: "Formal", age: "Adult", provider: "ElevenLabs", processes: ["Follow-up"], status: true },
  { id: 3, name: "Luna", gender: "Female", language: "English", accent: "Australian", country: "Australia", tone: "Friendly", age: "Young", provider: "Deepgram", processes: ["Appointment Scheduling"], status: true },
  { id: 4, name: "Alloy", gender: "Male", language: "English", accent: "American", country: "USA", tone: "Friendly", age: "Mid", provider: "OpenAI", processes: [], status: true },
  { id: 5, name: "Shimmer", gender: "Female", language: "English", accent: "British", country: "UK", tone: "Friendly", age: "Young", provider: "OpenAI", processes: [], status: true },
  { id: 6, name: "Echo", gender: "Male", language: "English", accent: "British", country: "UK", tone: "Professional", age: "Mid", provider: "OpenAI", processes: [], status: true },
  { id: 7, name: "Fable", gender: "Female", language: "English", accent: "Australian", country: "Australia", tone: "Casual", age: "Young", provider: "OpenAI", processes: [], status: true },
  { id: 8, name: "Onyx", gender: "Male", language: "English", accent: "American", country: "USA", tone: "Formal", age: "Mature", provider: "OpenAI", processes: [], status: true },
  { id: 9, name: "Bella", gender: "Female", language: "Spanish", accent: "Latin American", country: "Mexico", tone: "Friendly", age: "Young", provider: "ElevenLabs", processes: [], status: true },
  { id: 10, name: "Charlie", gender: "Male", language: "English", accent: "Australian", country: "Australia", tone: "Casual", age: "Mid", provider: "ElevenLabs", processes: [], status: true },
  { id: 11, name: "Daniel", gender: "Male", language: "English", accent: "British", country: "UK", tone: "Professional", age: "Mature", provider: "ElevenLabs", processes: [], status: true },
  { id: 12, name: "Mateo", gender: "Male", language: "Spanish", accent: "European", country: "Spain", tone: "Professional", age: "Adult", provider: "ElevenLabs", processes: [], status: true },
  { id: 13, name: "Emily", gender: "Female", language: "English", accent: "American", country: "USA", tone: "Empathetic", age: "Young", provider: "ElevenLabs", processes: [], status: true },
  { id: 14, name: "Finn", gender: "Male", language: "English", accent: "Irish", country: "Ireland", tone: "Friendly", age: "Mid", provider: "ElevenLabs", processes: [], status: true },
  { id: 15, name: "Grace", gender: "Female", language: "English", accent: "Canadian", country: "Canada", tone: "Professional", age: "Adult", provider: "ElevenLabs", processes: [], status: true },
  { id: 16, name: "Camille", gender: "Female", language: "French", accent: "European", country: "France", tone: "Empathetic", age: "Adult", provider: "ElevenLabs", processes: [], status: true },
  { id: 17, name: "Asteria", gender: "Female", language: "English", accent: "American", country: "USA", tone: "Energetic", age: "Young", provider: "Deepgram", processes: [], status: true },
  { id: 18, name: "Hans", gender: "Male", language: "German", accent: "European", country: "Germany", tone: "Formal", age: "Adult", provider: "Deepgram", processes: [], status: true },
  { id: 19, name: "Priya", gender: "Female", language: "Hindi", accent: "Indian", country: "India", tone: "Friendly", age: "Young", provider: "ElevenLabs", processes: [], status: true },
  { id: 20, name: "Stella", gender: "Female", language: "English", accent: "American", country: "USA", tone: "Empathetic", age: "Mid", provider: "Deepgram", processes: [], status: true },
  { id: 21, name: "Athena", gender: "Female", language: "English", accent: "British", country: "UK", tone: "Formal", age: "Adult", provider: "Deepgram", processes: [], status: true },
  { id: 22, name: "Sakura", gender: "Female", language: "Japanese", accent: "East Asian", country: "Japan", tone: "Gentle", age: "Young", provider: "ElevenLabs", processes: [], status: true },
  { id: 23, name: "Diego", gender: "Male", language: "Spanish", accent: "American", country: "USA", tone: "Casual", age: "Young", provider: "ElevenLabs", processes: [], status: true },
  { id: 24, name: "Lucas", gender: "Male", language: "Portuguese", accent: "Latin American", country: "Brazil", tone: "Friendly", age: "Young", provider: "ElevenLabs", processes: [], status: true },
];

export const VOICE_STORE_KEY = "mantra_voice_table_data";
export const VOICE_STORE_EVENT = "mantra_voice_store_updated";

export function getStoredVoices(): VoiceConfigItem[] {
  try {
    const raw = localStorage.getItem(VOICE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Map and backfill language and accent from defaults
        const defaultMap = new Map<number | string, VoiceConfigItem>();
        DEFAULT_VOICE_TABLE_DATA.forEach((v) => {
          defaultMap.set(v.id, v);
          defaultMap.set(v.name.toLowerCase(), v);
        });

        const merged: VoiceConfigItem[] = parsed.map((item: any, idx: number) => {
          const match = defaultMap.get(item.id) || defaultMap.get((item.name || "").toLowerCase());
          return {
            id: item.id || idx + 1,
            name: item.name || match?.name || `Voice ${idx + 1}`,
            gender: item.gender || match?.gender || "Female",
            language: item.language || match?.language || "English",
            accent: item.accent || match?.accent || "American",
            country: item.country || match?.country || "USA",
            tone: item.tone || match?.tone || "Professional",
            age: item.age || match?.age || "Young",
            provider: item.provider || match?.provider || "OpenAI",
            processes: Array.isArray(item.processes) ? item.processes : [],
            status: typeof item.status === "boolean" ? item.status : true,
          };
        });

        // Ensure newly added default voices are also present
        DEFAULT_VOICE_TABLE_DATA.forEach((def) => {
          if (!merged.some((m) => m.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        });

        return merged;
      }
    }
  } catch (e) {
    console.error("Error reading voice table from localStorage:", e);
  }
  return DEFAULT_VOICE_TABLE_DATA;
}

export function saveStoredVoices(voices: VoiceConfigItem[]): void {
  try {
    localStorage.setItem(VOICE_STORE_KEY, JSON.stringify(voices));
    window.dispatchEvent(new CustomEvent(VOICE_STORE_EVENT, { detail: voices }));
  } catch (e) {
    console.error("Error saving voices to localStorage:", e);
  }
}

export function toggleStoredVoiceStatus(id: number): VoiceConfigItem[] {
  const current = getStoredVoices();
  const updated = current.map((v) => (v.id === id ? { ...v, status: !v.status } : v));
  saveStoredVoices(updated);
  return updated;
}

export function getActiveVoices(): VoiceConfigItem[] {
  const all = getStoredVoices();
  const active = all.filter((v) => v.status === true);
  return active.length > 0 ? active : all;
}
