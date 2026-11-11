/**
 * telephonyAdminStore.ts
 * Path: src/lib/telephonyAdminStore.ts
 *
 * Centralized mock data store & service for Admin Telephony:
 * - Phone numbers inventory & organization assignment
 * - Cross-organization call logs
 * - Telephony provider integrations & credentials
 * All mutations record audit logs and persist to localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { recordAuditLog } from "./auditLogsStore";

export type TelephonyProviderName = "Twilio" | "Exotel" | "Plivo" | "Telnyx";
export type PhoneNumberType = "Local" | "Toll-free" | "Mobile";
export type PhoneNumberStatus = "Active" | "In Use" | "Unassigned" | "Suspended" | "Released";
export type PhoneNumberCapability = "voice" | "sms" | "whatsapp" | "mms";

export interface PhoneAssignmentHistory {
  date: string;
  action: "Assigned" | "Reassigned" | "Unassigned" | "Purchased" | "Suspended";
  orgName?: string;
  orgCode?: string;
  assignedTo?: string;
  actor: string;
  note?: string;
}

export interface PhoneNumberItem {
  id: string;
  number: string; // Formatted E.164 e.g. "+1 (555) 234-8901"
  rawNumber: string; // E.164 e.g. "+15552348901"
  provider: TelephonyProviderName;
  country: string; // "US" | "IN" | "GB" | "CA" | "AU"
  type: PhoneNumberType;
  assignedOrgId?: string;
  assignedOrgName?: string;
  assignedOrgCode?: string; // e.g. "ORG-0001"
  assignedTo?: string; // Department, Reception Desk or AI Scribe Agent
  status: PhoneNumberStatus;
  capabilities: PhoneNumberCapability[];
  targetCountries?: string[];
  monthlyCost: number;
  purchasedDate: string;
  lastCallTime?: string;
  callsLast30Days: number;
  callsTotal: number;
  webhookUrl?: string;
  webhookStatus: "Healthy" | "Degraded" | "Failed";
  history: PhoneAssignmentHistory[];
}

export interface AdminCallLogItem {
  id: string;
  timestamp: string; // ISO string
  orgId: string;
  orgName: string;
  orgCode: string;
  numberUsed: string;
  provider: TelephonyProviderName;
  direction: "Inbound" | "Outbound";
  caller: string;
  callee: string;
  duration: number; // in seconds
  status: "Answered" | "Missed" | "Voicemail" | "Busy" | "Failed";
  aiOutcome: "Appointment Booked" | "Inquiry Resolved" | "Transferred to Human" | "Callback Scheduled" | "No Action";
  recordingUrl?: string;
  cost: number;
  summary?: string;
}

export interface TelephonyProviderItem {
  id: string;
  name: TelephonyProviderName;
  description: string;
  status: "Connected" | "Degraded" | "Disconnected";
  maskedKey: string;
  maskedSecret: string;
  numbersCount: number;
  activeCalls: number;
  uptime: string;
  lastSyncTime: string;
  supportedTypes: PhoneNumberType[];
  accountSid: string;
  livekitCredentials?: {
    username: string;
    secret: string;
  };
  dograhCredentials?: {
    username: string;
    secret: string;
  };
  subscriptionDueDate?: string;
}

export const PHONE_NUMBERS_STORAGE_KEY = "mantra_admin_phone_numbers";
export const CALL_LOGS_STORAGE_KEY = "mantra_admin_call_logs";
export const TELEPHONY_PROVIDERS_STORAGE_KEY = "mantra_admin_telephony_providers";
export const TELEPHONY_ADMIN_EVENT = "mantra-telephony-admin-updated";

// Seeded Initial Phone Numbers
export const INITIAL_PHONE_NUMBERS: PhoneNumberItem[] = [
  {
    id: "num-001",
    number: "+1 (415) 890-2100",
    rawNumber: "+14158902100",
    provider: "Twilio",
    country: "US",
    type: "Local",
    assignedOrgId: "org-1",
    assignedOrgName: "Eye Mantra Hospital",
    assignedOrgCode: "ORG-0001",
    assignedTo: "Ophthalmology AI Receptionist",
    status: "In Use",
    capabilities: ["voice", "sms", "whatsapp"],
    targetCountries: ["US", "CA"],
    monthlyCost: 15.0,
    purchasedDate: "2024-01-15T09:00:00.000Z",
    lastCallTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    callsLast30Days: 1420,
    callsTotal: 8940,
    webhookUrl: "https://api.mantra.care/telephony/twilio/webhook/num-001",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-01-15T09:00:00.000Z",
        action: "Purchased",
        actor: "Alexander Vance",
        note: "Purchased via Twilio Carrier Direct",
      },
      {
        date: "2024-01-16T11:00:00.000Z",
        action: "Assigned",
        orgName: "Eye Mantra Hospital",
        orgCode: "ORG-0001",
        assignedTo: "Ophthalmology AI Receptionist",
        actor: "Alexander Vance",
        note: "Assigned to main outpatient line",
      },
    ],
  },
  {
    id: "num-002",
    number: "+1 (800) 420-9912",
    rawNumber: "+18004209912",
    provider: "Twilio",
    country: "US",
    type: "Toll-free",
    assignedOrgId: "org-1",
    assignedOrgName: "Eye Mantra Hospital",
    assignedOrgCode: "ORG-0001",
    assignedTo: "Emergency LASIK Hotline",
    status: "In Use",
    capabilities: ["voice", "sms"],
    monthlyCost: 25.0,
    purchasedDate: "2024-02-01T14:30:00.000Z",
    lastCallTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    callsLast30Days: 890,
    callsTotal: 5120,
    webhookUrl: "https://api.mantra.care/telephony/twilio/webhook/num-002",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-02-01T14:30:00.000Z",
        action: "Purchased",
        actor: "Alexander Vance",
        note: "Allocated 800 Toll-Free prefix",
      },
      {
        date: "2024-02-02T10:00:00.000Z",
        action: "Assigned",
        orgName: "Eye Mantra Hospital",
        orgCode: "ORG-0001",
        assignedTo: "Emergency LASIK Hotline",
        actor: "Alexander Vance",
      },
    ],
  },
  {
    id: "num-003",
    number: "+91 80 4719 3200",
    rawNumber: "+918047193200",
    provider: "Exotel",
    country: "IN",
    type: "Local",
    assignedOrgId: "org-2",
    assignedOrgName: "Demo Mantra Care",
    assignedOrgCode: "ORG-0002",
    assignedTo: "Bangalore Main Inbound IVR",
    status: "In Use",
    capabilities: ["voice", "sms"],
    monthlyCost: 18.5,
    purchasedDate: "2024-02-10T08:15:00.000Z",
    lastCallTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    callsLast30Days: 2310,
    callsTotal: 12400,
    webhookUrl: "https://api.mantra.care/telephony/exotel/webhook/num-003",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-02-10T08:15:00.000Z",
        action: "Purchased",
        actor: "Elena Rostova",
      },
      {
        date: "2024-02-10T12:00:00.000Z",
        action: "Assigned",
        orgName: "Demo Mantra Care",
        orgCode: "ORG-0002",
        assignedTo: "Bangalore Main Inbound IVR",
        actor: "Elena Rostova",
      },
    ],
  },
  {
    id: "num-004",
    number: "+1 (212) 779-4321",
    rawNumber: "+12127794321",
    provider: "Plivo",
    country: "US",
    type: "Local",
    assignedOrgId: "org-3",
    assignedOrgName: "Heart Care Clinic",
    assignedOrgCode: "ORG-0003",
    assignedTo: "Cardiology Triage AI Agent",
    status: "In Use",
    capabilities: ["voice", "sms", "whatsapp"],
    targetCountries: ["US", "CA"],
    monthlyCost: 15.0,
    purchasedDate: "2024-03-01T11:20:00.000Z",
    lastCallTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    callsLast30Days: 640,
    callsTotal: 3450,
    webhookUrl: "https://api.mantra.care/telephony/plivo/webhook/num-004",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-03-01T11:20:00.000Z",
        action: "Purchased",
        actor: "Alexander Vance",
      },
      {
        date: "2024-03-02T09:00:00.000Z",
        action: "Assigned",
        orgName: "Heart Care Clinic",
        orgCode: "ORG-0003",
        assignedTo: "Cardiology Triage AI Agent",
        actor: "Alexander Vance",
      },
    ],
  },
  {
    id: "num-005",
    number: "+1 (312) 990-1120",
    rawNumber: "+13129901120",
    provider: "Twilio",
    country: "US",
    type: "Local",
    status: "Unassigned",
    capabilities: ["voice", "sms"],
    monthlyCost: 12.0,
    purchasedDate: "2024-04-10T16:00:00.000Z",
    callsLast30Days: 0,
    callsTotal: 140,
    webhookUrl: "https://api.mantra.care/telephony/twilio/webhook/num-005",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-04-10T16:00:00.000Z",
        action: "Purchased",
        actor: "Alexander Vance",
        note: "Pre-provisioned pool stock",
      },
      {
        date: "2024-05-01T10:00:00.000Z",
        action: "Unassigned",
        actor: "Elena Rostova",
        note: "Released from test clinic back to pool",
      },
    ],
  },
  {
    id: "num-006",
    number: "+44 20 7946 0991",
    rawNumber: "+442079460991",
    provider: "Telnyx",
    country: "GB",
    type: "Local",
    status: "Unassigned",
    capabilities: ["voice", "sms"],
    monthlyCost: 14.0,
    purchasedDate: "2024-04-12T10:00:00.000Z",
    callsLast30Days: 0,
    callsTotal: 0,
    webhookUrl: "https://api.mantra.care/telephony/telnyx/webhook/num-006",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-04-12T10:00:00.000Z",
        action: "Purchased",
        actor: "Elena Rostova",
        note: "UK geographic DID stock",
      },
    ],
  },
  {
    id: "num-007",
    number: "+1 (650) 412-8877",
    rawNumber: "+16504128877",
    provider: "Twilio",
    country: "US",
    type: "Local",
    status: "Unassigned",
    capabilities: ["voice", "sms", "whatsapp"],
    monthlyCost: 15.0,
    purchasedDate: "2024-04-20T12:00:00.000Z",
    callsLast30Days: 0,
    callsTotal: 0,
    webhookUrl: "https://api.mantra.care/telephony/twilio/webhook/num-007",
    webhookStatus: "Healthy",
    history: [
      {
        date: "2024-04-20T12:00:00.000Z",
        action: "Purchased",
        actor: "Alexander Vance",
      },
    ],
  },
];

// Seeded Initial Cross-Org Calls
export const INITIAL_CALL_LOGS: AdminCallLogItem[] = [
  {
    id: "CALL-9821",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    numberUsed: "+1 (415) 890-2100",
    provider: "Twilio",
    direction: "Inbound",
    caller: "+1 (415) 309-8812",
    callee: "+1 (415) 890-2100",
    duration: 184,
    status: "Answered",
    aiOutcome: "Appointment Booked",
    cost: 0.12,
    recordingUrl: "https://audio.mantra.care/recordings/call-9821.mp3",
    summary: "Patient booked LASIK initial evaluation consultation with Dr. Mehta for Friday at 10:00 AM.",
  },
  {
    id: "CALL-9820",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    numberUsed: "+91 80 4719 3200",
    provider: "Exotel",
    direction: "Inbound",
    caller: "+91 98450 12345",
    callee: "+91 80 4719 3200",
    duration: 95,
    status: "Answered",
    aiOutcome: "Inquiry Resolved",
    cost: 0.05,
    recordingUrl: "https://audio.mantra.care/recordings/call-9820.mp3",
    summary: "Patient enquired about MRI report readiness. Voice agent confirmed reports were mailed to email.",
  },
  {
    id: "CALL-9819",
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    numberUsed: "+1 (212) 779-4321",
    provider: "Plivo",
    direction: "Inbound",
    caller: "+1 (212) 555-0199",
    callee: "+1 (212) 779-4321",
    duration: 240,
    status: "Answered",
    aiOutcome: "Transferred to Human",
    cost: 0.16,
    recordingUrl: "https://audio.mantra.care/recordings/call-9819.mp3",
    summary: "Caller reported shortness of breath post-stent implant; triage agent safely escalated directly to duty cardiologist.",
  },
  {
    id: "CALL-9818",
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    numberUsed: "+1 (415) 890-2100",
    provider: "Twilio",
    direction: "Outbound",
    caller: "+1 (415) 890-2100",
    callee: "+1 (415) 782-9910",
    duration: 62,
    status: "Answered",
    aiOutcome: "Callback Scheduled",
    cost: 0.08,
    recordingUrl: "https://audio.mantra.care/recordings/call-9818.mp3",
    summary: "Automated pre-op appointment confirmation call. Patient requested evening callback to confirm ride.",
  },
  {
    id: "CALL-9817",
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    numberUsed: "+91 80 4719 3200",
    provider: "Exotel",
    direction: "Inbound",
    caller: "+91 99001 88310",
    callee: "+91 80 4719 3200",
    duration: 0,
    status: "Missed",
    aiOutcome: "No Action",
    cost: 0.0,
    summary: "Caller hung up after 2 rings before IVR pickup.",
  },
  {
    id: "CALL-9816",
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    numberUsed: "+1 (800) 420-9912",
    provider: "Twilio",
    direction: "Inbound",
    caller: "+1 (650) 802-9912",
    callee: "+1 (800) 420-9912",
    duration: 145,
    status: "Answered",
    aiOutcome: "Appointment Booked",
    cost: 0.14,
    recordingUrl: "https://audio.mantra.care/recordings/call-9816.mp3",
    summary: "Patient booked Cataract diagnostic scan for Monday 9:30 AM.",
  },
];

// Seeded Initial Telephony Providers
export const INITIAL_TELEPHONY_PROVIDERS: TelephonyProviderItem[] = [
  {
    id: "prov-twilio",
    name: "Twilio",
    description: "Primary carrier for North American and European voice, SMS, and WhatsApp DIDs.",
    status: "Connected",
    maskedKey: "SK••••••••••••••••••••••••382b",
    maskedSecret: "••••••••••••••••••••••••9a01",
    accountSid: "AC910b82f0918342718293aa110294812",
    numbersCount: 4,
    activeCalls: 3,
    uptime: "99.99%",
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    supportedTypes: ["Local", "Toll-free", "Mobile"],
    livekitCredentials: {
      username: "sip_livekit_twilio_trunk",
      secret: "lk_sec_99a8182f091bc4",
    },
    dograhCredentials: {
      username: "sip_dograh_twilio_prod",
      secret: "dgr_sec_77b1029c33ef1",
    },
    subscriptionDueDate: "2026-11-15", // within 4 days (warning style)
  },
  {
    id: "prov-exotel",
    name: "Exotel",
    description: "Cloud telephony provider for Indian subcontinent operations, virtual numbers and IVR.",
    status: "Connected",
    maskedKey: "EX••••••••••••••••••••••••109f",
    maskedSecret: "••••••••••••••••••••••••881c",
    accountSid: "exo_mantra_prod_blr",
    numbersCount: 1,
    activeCalls: 1,
    uptime: "99.95%",
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    supportedTypes: ["Local", "Toll-free"],
    livekitCredentials: {
      username: "sip_livekit_exotel_asia",
      secret: "lk_sec_exo_88192a01",
    },
    dograhCredentials: {
      username: "sip_dograh_exotel_blr",
      secret: "dgr_sec_exo_77341bb2",
    },
    subscriptionDueDate: "2026-12-01",
  },
  {
    id: "prov-plivo",
    name: "Plivo",
    description: "High-throughput messaging and secondary voice carrier with global reach.",
    status: "Connected",
    maskedKey: "MA••••••••••••••••••••••••8374",
    maskedSecret: "••••••••••••••••••••••••ff02",
    accountSid: "PLIVOMANTRA991823",
    numbersCount: 1,
    activeCalls: 0,
    uptime: "99.98%",
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    supportedTypes: ["Local", "Toll-free"],
    livekitCredentials: {
      username: "sip_livekit_plivo_trunk",
      secret: "lk_sec_plivo_661902a",
    },
    dograhCredentials: {
      username: "sip_dograh_plivo_gw",
      secret: "dgr_sec_plivo_554189e",
    },
    subscriptionDueDate: "2026-11-10", // overdue (warning style)
  },
  {
    id: "prov-telnyx",
    name: "Telnyx",
    description: "Private global IP network for low-latency SIP trunks, UK and APAC numbers.",
    status: "Connected",
    maskedKey: "KEY••••••••••••••••••••••••09aa",
    maskedSecret: "••••••••••••••••••••••••12b4",
    accountSid: "telnyx_org_881923",
    numbersCount: 1,
    activeCalls: 0,
    uptime: "99.99%",
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    supportedTypes: ["Local", "Mobile"],
    livekitCredentials: {
      username: "sip_livekit_telnyx_global",
      secret: "lk_sec_telnyx_11209b",
    },
    dograhCredentials: {
      username: "sip_dograh_telnyx_core",
      secret: "dgr_sec_telnyx_33491c",
    },
    subscriptionDueDate: "2026-12-15",
  },
];

// Helper functions for reading & writing storage
export function getStoredPhoneNumbers(): PhoneNumberItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_PHONE_NUMBERS;
    const raw = localStorage.getItem(PHONE_NUMBERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PHONE_NUMBERS_STORAGE_KEY, JSON.stringify(INITIAL_PHONE_NUMBERS));
      return INITIAL_PHONE_NUMBERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PHONE_NUMBERS;
  } catch {
    return INITIAL_PHONE_NUMBERS;
  }
}

export function saveStoredPhoneNumbers(items: PhoneNumberItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(PHONE_NUMBERS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(TELEPHONY_ADMIN_EVENT));
    }
  } catch (err) {
    console.error("Failed to save phone numbers:", err);
  }
}

export function getStoredCallLogs(): AdminCallLogItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_CALL_LOGS;
    const raw = localStorage.getItem(CALL_LOGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CALL_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_CALL_LOGS));
      return INITIAL_CALL_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CALL_LOGS;
  } catch {
    return INITIAL_CALL_LOGS;
  }
}

export function saveStoredCallLogs(items: AdminCallLogItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(CALL_LOGS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(TELEPHONY_ADMIN_EVENT));
    }
  } catch (err) {
    console.error("Failed to save call logs:", err);
  }
}

export function getStoredTelephonyProviders(): TelephonyProviderItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_TELEPHONY_PROVIDERS;
    const raw = localStorage.getItem(TELEPHONY_PROVIDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TELEPHONY_PROVIDERS_STORAGE_KEY, JSON.stringify(INITIAL_TELEPHONY_PROVIDERS));
      return INITIAL_TELEPHONY_PROVIDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_TELEPHONY_PROVIDERS;
    return parsed.map((p: any) => {
      const init = INITIAL_TELEPHONY_PROVIDERS.find((i) => i.id === p.id);
      return {
        ...p,
        livekitCredentials: p.livekitCredentials?.username
          ? p.livekitCredentials
          : init?.livekitCredentials || { username: `sip_livekit_${p.name.toLowerCase()}_trunk`, secret: "lk_sec_masked_key" },
        dograhCredentials: p.dograhCredentials?.username
          ? p.dograhCredentials
          : init?.dograhCredentials || { username: `sip_dograh_${p.name.toLowerCase()}_gw`, secret: "dgr_sec_masked_key" },
      };
    });
  } catch {
    return INITIAL_TELEPHONY_PROVIDERS;
  }
}

export function saveStoredTelephonyProviders(items: TelephonyProviderItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TELEPHONY_PROVIDERS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(TELEPHONY_ADMIN_EVENT));
    }
  } catch (err) {
    console.error("Failed to save telephony providers:", err);
  }
}

// ==========================================
// Administrative Mutations with Audit Logs
// ==========================================

export function assignPhoneNumber(
  numberId: string,
  orgId: string,
  orgName: string,
  orgCode: string,
  assignedTo?: string
): PhoneNumberItem | null {
  const list = getStoredPhoneNumbers();
  const idx = list.findIndex((p) => p.id === numberId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: PhoneNumberItem = {
    ...prev,
    assignedOrgId: orgId,
    assignedOrgName: orgName,
    assignedOrgCode: orgCode,
    assignedTo: assignedTo || "General Line",
    status: "In Use",
    history: [
      {
        date: new Date().toISOString(),
        action: prev.assignedOrgId ? "Reassigned" : "Assigned",
        orgName,
        orgCode,
        assignedTo: assignedTo || "General Line",
        actor: "Admin",
        note: `Allocated to ${orgName} (${orgCode})`,
      },
      ...prev.history,
    ],
  };

  list[idx] = updated;
  saveStoredPhoneNumbers(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "assigned",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: updated.id,
    targetName: `${updated.number} (${orgName})`,
    summary: `Assigned phone number ${updated.number} to ${orgName} (${orgCode}) for ${assignedTo || "General Line"}`,
    before: {
      assignedOrgId: prev.assignedOrgId,
      assignedOrgName: prev.assignedOrgName,
      status: prev.status,
    },
    after: {
      assignedOrgId: updated.assignedOrgId,
      assignedOrgName: updated.assignedOrgName,
      status: updated.status,
    },
  });

  return updated;
}

export function unassignPhoneNumber(numberId: string, reason?: string): PhoneNumberItem | null {
  const list = getStoredPhoneNumbers();
  const idx = list.findIndex((p) => p.id === numberId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: PhoneNumberItem = {
    ...prev,
    assignedOrgId: undefined,
    assignedOrgName: undefined,
    assignedOrgCode: undefined,
    assignedTo: undefined,
    status: "Unassigned",
    history: [
      {
        date: new Date().toISOString(),
        action: "Unassigned",
        orgName: prev.assignedOrgName,
        orgCode: prev.assignedOrgCode,
        actor: "Admin",
        note: reason || "Returned to shared pool",
      },
      ...prev.history,
    ],
  };

  list[idx] = updated;
  saveStoredPhoneNumbers(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "unassigned",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: updated.id,
    targetName: updated.number,
    summary: `Unassigned phone number ${updated.number} from ${prev.assignedOrgName || "Unknown Org"}`,
    before: {
      assignedOrgId: prev.assignedOrgId,
      assignedOrgName: prev.assignedOrgName,
      status: prev.status,
    },
    after: {
      assignedOrgId: null,
      assignedOrgName: null,
      status: updated.status,
    },
  });

  return updated;
}

export function releasePhoneNumber(numberId: string, reason?: string): PhoneNumberItem | null {
  const list = getStoredPhoneNumbers();
  const idx = list.findIndex((p) => p.id === numberId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: PhoneNumberItem = {
    ...prev,
    assignedOrgId: undefined,
    assignedOrgName: undefined,
    assignedOrgCode: undefined,
    assignedTo: undefined,
    status: "Released",
    history: [
      {
        date: new Date().toISOString(),
        action: "Suspended",
        actor: "Admin",
        note: reason || "Released back to carrier inventory",
      },
      ...prev.history,
    ],
  };

  list[idx] = updated;
  saveStoredPhoneNumbers(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "deleted",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: updated.id,
    targetName: updated.number,
    summary: `Released phone number ${updated.number} back to carrier (${prev.provider})`,
    before: { status: prev.status },
    after: { status: "Released" },
  });

  return updated;
}

export function addPhoneNumber(item: Omit<PhoneNumberItem, "id" | "purchasedDate" | "callsLast30Days" | "callsTotal" | "webhookStatus" | "history">): PhoneNumberItem {
  const list = getStoredPhoneNumbers();
  const newId = `num-${Date.now().toString(36)}`;
  const newItem: PhoneNumberItem = {
    ...item,
    id: newId,
    purchasedDate: new Date().toISOString(),
    callsLast30Days: 0,
    callsTotal: 0,
    webhookStatus: "Healthy",
    webhookUrl: `https://api.mantra.care/telephony/${item.provider.toLowerCase()}/webhook/${newId}`,
    history: [
      {
        date: new Date().toISOString(),
        action: "Purchased",
        actor: "Admin",
        note: `Added manually to pool via ${item.provider}`,
      },
    ],
  };

  list.unshift(newItem);
  saveStoredPhoneNumbers(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: newItem.id,
    targetName: newItem.number,
    summary: `Added new ${newItem.type} phone number ${newItem.number} via ${newItem.provider}`,
    before: null,
    after: {
      number: newItem.number,
      provider: newItem.provider,
      monthlyCost: newItem.monthlyCost,
      status: newItem.status,
    },
  });

  return newItem;
}

export function updateTelephonyProviderCredentials(
  providerId: string,
  accountSid: string,
  apiKey: string,
  apiSecret: string
): TelephonyProviderItem | null {
  const list = getStoredTelephonyProviders();
  const idx = list.findIndex((p) => p.id === providerId);
  if (idx === -1) return null;

  const prev = list[idx];
  const maskedKey = apiKey.length > 6 ? `${apiKey.substring(0, 4)}••••••••••••${apiKey.slice(-4)}` : prev.maskedKey;
  const maskedSecret = apiSecret.length > 4 ? `••••••••••••${apiSecret.slice(-4)}` : prev.maskedSecret;

  const updated: TelephonyProviderItem = {
    ...prev,
    accountSid: accountSid || prev.accountSid,
    maskedKey,
    maskedSecret,
    lastSyncTime: new Date().toISOString(),
    status: "Connected",
  };

  list[idx] = updated;
  saveStoredTelephonyProviders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Telephony",
    entityType: "TelephonyProvider",
    entityId: updated.id,
    targetName: updated.name,
    summary: `Updated API credentials and re-verified webhook connection for ${updated.name}`,
    before: { status: prev.status, accountSid: prev.accountSid },
    after: { status: updated.status, accountSid: updated.accountSid },
  });

  return updated;
}

export function configureTelephonyProvider(
  providerId: string,
  updates: {
    name?: TelephonyProviderName;
    livekitCredentials?: { username: string; secret: string };
    dograhCredentials?: { username: string; secret: string };
    subscriptionDueDate?: string;
  }
): TelephonyProviderItem | null {
  const list = getStoredTelephonyProviders();
  const idx = list.findIndex((p) => p.id === providerId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: TelephonyProviderItem = {
    ...prev,
    name: updates.name || prev.name,
    livekitCredentials: updates.livekitCredentials || prev.livekitCredentials,
    dograhCredentials: updates.dograhCredentials || prev.dograhCredentials,
    subscriptionDueDate: updates.subscriptionDueDate || prev.subscriptionDueDate,
    lastSyncTime: new Date().toISOString(),
  };

  list[idx] = updated;
  saveStoredTelephonyProviders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Telephony",
    entityType: "TelephonyProvider",
    entityId: updated.id,
    targetName: updated.name,
    summary: `Configured SIP credentials and subscription renewal for carrier ${updated.name}`,
    before: { name: prev.name, subscriptionDueDate: prev.subscriptionDueDate },
    after: { name: updated.name, subscriptionDueDate: updated.subscriptionDueDate },
  });

  return updated;
}

export function addTelephonyProvider(provider: {
  name: TelephonyProviderName;
  livekitCredentials: { username: string; secret: string };
  dograhCredentials: { username: string; secret: string };
  subscriptionDueDate: string;
}): TelephonyProviderItem {
  const list = getStoredTelephonyProviders();
  const newId = `prov-${Date.now().toString(36)}`;
  const newItem: TelephonyProviderItem = {
    id: newId,
    name: provider.name,
    description: `Configured carrier integration for ${provider.name}`,
    status: "Connected",
    maskedKey: "SK••••••••••••••••••••••••" + newId.slice(-4),
    maskedSecret: "••••••••••••••••••••••••" + newId.slice(-4),
    accountSid: `AC_${provider.name.toLowerCase()}_${newId}`,
    numbersCount: 0,
    activeCalls: 0,
    uptime: "100.0%",
    lastSyncTime: new Date().toISOString(),
    supportedTypes: ["Local", "Toll-free", "Mobile"],
    livekitCredentials: provider.livekitCredentials,
    dograhCredentials: provider.dograhCredentials,
    subscriptionDueDate: provider.subscriptionDueDate,
  };

  list.push(newItem);
  saveStoredTelephonyProviders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "created",
    module: "Telephony",
    entityType: "TelephonyProvider",
    entityId: newItem.id,
    targetName: newItem.name,
    summary: `Added new carrier provider ${newItem.name} with LiveKit and Dograh SIP trunks`,
    before: null,
    after: { name: newItem.name, subscriptionDueDate: newItem.subscriptionDueDate },
  });

  return newItem;
}

export function updateNumberTargetCountries(numberId: string, targetCountries: string[]): PhoneNumberItem | null {
  const list = getStoredPhoneNumbers();
  const idx = list.findIndex((p) => p.id === numberId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: PhoneNumberItem = {
    ...prev,
    targetCountries,
  };

  list[idx] = updated;
  saveStoredPhoneNumbers(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Phone Numbers",
    entityType: "PhoneNumber",
    entityId: updated.id,
    targetName: updated.number,
    summary: `Updated target countries for ${updated.number} to [${targetCountries.join(", ")}]`,
    before: { targetCountries: prev.targetCountries },
    after: { targetCountries },
  });

  return updated;
}

export function recordRevealSecretAudit(providerName: string, aiProvider: "LiveKit" | "Dograh") {
  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "login",
    module: "Telephony",
    entityType: "TelephonyCredentials",
    entityId: `${providerName}-${aiProvider}`,
    targetName: `${providerName} (${aiProvider} SIP Secret)`,
    summary: `Revealed plaintext SIP secret for ${providerName} on ${aiProvider}`,
    before: { masked: true },
    after: { masked: false },
  });
}

// React Hooks
export function useAdminPhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberItem[]>(getStoredPhoneNumbers);

  const refresh = useCallback(() => {
    setPhoneNumbers(getStoredPhoneNumbers());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(TELEPHONY_ADMIN_EVENT, handler);
    return () => window.removeEventListener(TELEPHONY_ADMIN_EVENT, handler);
  }, [refresh]);

  return { phoneNumbers, refresh };
}

export function useAdminCallLogs() {
  const [callLogs, setCallLogs] = useState<AdminCallLogItem[]>(getStoredCallLogs);

  const refresh = useCallback(() => {
    setCallLogs(getStoredCallLogs());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(TELEPHONY_ADMIN_EVENT, handler);
    return () => window.removeEventListener(TELEPHONY_ADMIN_EVENT, handler);
  }, [refresh]);

  return { callLogs, refresh };
}

export function useAdminTelephonyProviders() {
  const [providers, setProviders] = useState<TelephonyProviderItem[]>(getStoredTelephonyProviders);

  const refresh = useCallback(() => {
    setProviders(getStoredTelephonyProviders());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(TELEPHONY_ADMIN_EVENT, handler);
    return () => window.removeEventListener(TELEPHONY_ADMIN_EVENT, handler);
  }, [refresh]);

  return { providers, refresh };
}

