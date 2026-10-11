export interface VoiceConfigItem {
  id: number;
  name: string;
  gender: string;
  country: string;
  tone: string;
  age: string;
  processes: string[];
  status: boolean;
}

export const DEFAULT_VOICE_TABLE_DATA: VoiceConfigItem[] = [
  { id: 1, name: "Nova", gender: "Female", country: "USA", tone: "Professional", age: "Young", processes: ["Insurance Verification"], status: true },
  { id: 2, name: "Atlas", gender: "Male", country: "UK", tone: "Formal", age: "Adult", processes: ["Follow-up"], status: true },
  { id: 3, name: "Luna", gender: "Female", country: "Australia", tone: "Friendly", age: "Young", processes: ["Appointment Scheduling"], status: true },
  { id: 4, name: "Alloy", gender: "Male", country: "USA", tone: "Friendly", age: "Mid", processes: [], status: true },
  { id: 5, name: "Shimmer", gender: "Female", country: "UK", tone: "Friendly", age: "Young", processes: [], status: true },
  { id: 6, name: "Echo", gender: "Male", country: "UK", tone: "Professional", age: "Mid", processes: [], status: true },
  { id: 7, name: "Fable", gender: "Female", country: "Australia", tone: "Casual", age: "Young", processes: [], status: true },
  { id: 8, name: "Onyx", gender: "Male", country: "USA", tone: "Formal", age: "Mature", processes: [], status: true },
  { id: 9, name: "Bella", gender: "Female", country: "USA", tone: "Friendly", age: "Young", processes: [], status: true },
  { id: 10, name: "Charlie", gender: "Male", country: "Australia", tone: "Casual", age: "Mid", processes: [], status: true },
  { id: 11, name: "Daniel", gender: "Male", country: "UK", tone: "Professional", age: "Mature", processes: [], status: true },
  { id: 12, name: "Emily", gender: "Female", country: "USA", tone: "Empathetic", age: "Young", processes: [], status: true },
  { id: 13, name: "Finn", gender: "Male", country: "Ireland", tone: "Friendly", age: "Mid", processes: [], status: true },
  { id: 14, name: "Grace", gender: "Female", country: "Canada", tone: "Professional", age: "Adult", processes: [], status: true },
  { id: 15, name: "Asteria", gender: "Female", country: "USA", tone: "Energetic", age: "Young", processes: [], status: true },
  { id: 16, name: "Stella", gender: "Female", country: "USA", tone: "Empathetic", age: "Mid", processes: [], status: true },
  { id: 17, name: "Athena", gender: "Female", country: "UK", tone: "Formal", age: "Adult", processes: [], status: true },
  { id: 18, name: "Hera", gender: "Female", country: "USA", tone: "Professional", age: "Mature", processes: [], status: true },
  { id: 19, name: "Orion", gender: "Male", country: "USA", tone: "Casual", age: "Young", processes: [], status: true },
  { id: 20, name: "Perseus", gender: "Male", country: "USA", tone: "Formal", age: "Adult", processes: [], status: true },
];

export const VOICE_STORE_KEY = "mantra_voice_table_data";
export const VOICE_STORE_EVENT = "mantra_voice_store_updated";

export function getStoredVoices(): VoiceConfigItem[] {
  try {
    const raw = localStorage.getItem(VOICE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 20) {
        return parsed;
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // Upgrade stored voices by merging existing status overrides with new 20 items
        const existingStatusMap = new Map<number, boolean>();
        parsed.forEach((item: VoiceConfigItem) => {
          existingStatusMap.set(item.id, item.status);
        });
        const upgraded = DEFAULT_VOICE_TABLE_DATA.map((v) => ({
          ...v,
          status: existingStatusMap.has(v.id) ? (existingStatusMap.get(v.id) as boolean) : v.status,
        }));
        saveStoredVoices(upgraded);
        return upgraded;
      }
    }
  } catch (e) {
    console.error("Error reading voice table from localStorage:", e);
  }
  return DEFAULT_VOICE_TABLE_DATA;
}

export function saveStoredVoices(voices: VoiceConfigItem[]) {
  try {
    localStorage.setItem(VOICE_STORE_KEY, JSON.stringify(voices));
    window.dispatchEvent(new Event(VOICE_STORE_EVENT));
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
