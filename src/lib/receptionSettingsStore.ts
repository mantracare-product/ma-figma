/**
 * receptionSettingsStore.ts
 * Path: src/lib/receptionSettingsStore.ts
 *
 * Centralized store for AI Receptionist configuration (per organization) synced live
 * across Client Settings and waiting-room `/reception` kiosk terminals.
 */

import type {
  ReceptionConfig,
  ReceptionFeatureFlags,
  ReceptionTerminal,
} from "../reception/types/reception";

const CONFIG_STORAGE_KEY = "ma_reception_config";
export const RECEPTION_CONFIG_UPDATED_EVENT = "ma_reception_config_updated";
export const DEFAULT_RECEPTION_ORG_ID = "org_mantracare_default";

export const DEFAULT_RECEPTION_FEATURES: ReceptionFeatureFlags = {
  walkIn: true,
  faceCheckin: true,
  qrCheckin: true,
  voice: true,
  payments: true,
  printToken: false,
};

export const DEFAULT_RECEPTION_TERMINALS: ReceptionTerminal[] = [
  { id: "term_front_desk", name: "Front Desk", locationLabel: "Lobby" },
  { id: "term_opd_desk", name: "OPD Desk", locationLabel: "Floor 1" },
];

export interface ReceptionOrgMeta {
  name?: string;
  phone?: string;
  email?: string;
}

export function buildDefaultReceptionConfig(
  orgId: string = DEFAULT_RECEPTION_ORG_ID,
  meta?: ReceptionOrgMeta
): ReceptionConfig {
  const clinic = meta?.name?.trim() || "MantraCare";
  const slug = clinic.toLowerCase().replace(/[^a-z0-9]+/g, "") || "mantracare";

  return {
    orgId,
    clinicName: clinic,
    greetingPhrase: `Welcome to ${clinic}. How can I help you today?`,
    supportPhone: meta?.phone || "+91-9876543210",
    supportEmail: meta?.email || `desk@${slug}.test`,
    primaryColor: "#2f2447",
    features: { ...DEFAULT_RECEPTION_FEATURES },
    terminals: DEFAULT_RECEPTION_TERMINALS.map((t) => ({ ...t })),
    tokenPrefixes: {
      doctor: "D-",
      pharmacy: "P-",
      lab: "L-",
      billing: "B-",
      desk: "R-",
    },
    lateArrivalWindowMin: 15,
    earlyArrivalBufferMin: 30,
    queueAgingCapMin: 45,
    defaultLanguages: ["en", "hi"],
    defaultOnboardingProcessId: "Appointment Scheduling",
  };
}

export function getStoredReceptionConfig(
  orgId: string = DEFAULT_RECEPTION_ORG_ID,
  meta?: ReceptionOrgMeta
): ReceptionConfig {
  const base = buildDefaultReceptionConfig(orgId, meta);
  if (typeof window === "undefined") return base;

  try {
    const orgKey = `${CONFIG_STORAGE_KEY}_${orgId}`;
    const orgSavedRaw = localStorage.getItem(orgKey);
    const sharedSavedRaw = orgSavedRaw ? null : localStorage.getItem(CONFIG_STORAGE_KEY);
    const rawParsed = orgSavedRaw
      ? JSON.parse(orgSavedRaw)
      : sharedSavedRaw
        ? JSON.parse(sharedSavedRaw)
        : null;

    // Ignore shared fallback if it belongs to a different organization
    const usableRaw =
      rawParsed && !orgSavedRaw && rawParsed.orgId && rawParsed.orgId !== orgId
        ? null
        : rawParsed;

    if (!usableRaw) return base;

    return {
      ...base,
      ...usableRaw,
      orgId,
      clinicName: usableRaw.clinicName ?? base.clinicName,
      greetingPhrase: usableRaw.greetingPhrase ?? base.greetingPhrase,
      supportPhone: usableRaw.supportPhone ?? base.supportPhone,
      supportEmail: usableRaw.supportEmail ?? base.supportEmail,
      primaryColor: usableRaw.primaryColor || base.primaryColor,
      features: { ...DEFAULT_RECEPTION_FEATURES, ...(usableRaw.features || {}) },
      terminals: Array.isArray(usableRaw.terminals) ? usableRaw.terminals : base.terminals,
      tokenPrefixes: { ...base.tokenPrefixes, ...(usableRaw.tokenPrefixes || {}) },
    };
  } catch {
    return base;
  }
}

export function getActiveKioskReceptionConfig(orgIdParam?: string | null): Partial<ReceptionConfig> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      (orgIdParam ? localStorage.getItem(`${CONFIG_STORAGE_KEY}_${orgIdParam}`) : null) ||
      localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveReceptionConfig(orgId: string, config: ReceptionConfig): void {
  if (typeof window === "undefined") return;
  const normalized: ReceptionConfig = { ...config, orgId };
  localStorage.setItem(`${CONFIG_STORAGE_KEY}_${orgId}`, JSON.stringify(normalized));
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(RECEPTION_CONFIG_UPDATED_EVENT, { detail: normalized }));
}

export function onReceptionConfigChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith(CONFIG_STORAGE_KEY)) {
      listener();
    }
  };
  window.addEventListener(RECEPTION_CONFIG_UPDATED_EVENT, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(RECEPTION_CONFIG_UPDATED_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

