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
  { id: 7, name: "Fable", gender: "Female", country: "Australia", tone: "Casual", age: "Young", processes: [], status: false },
  { id: 8, name: "Onyx", gender: "Male", country: "USA", tone: "Formal", age: "Mature", processes: [], status: false },
];

export const VOICE_STORE_KEY = "mantra_voice_table_data";
export const VOICE_STORE_EVENT = "mantra_voice_store_updated";

export function getStoredVoices(): VoiceConfigItem[] {
  try {
    const raw = localStorage.getItem(VOICE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
