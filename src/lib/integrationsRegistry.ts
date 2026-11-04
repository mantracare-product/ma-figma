/**
 * integrationsRegistry.ts
 * Unified Manifest-Driven Registry for MantraAssist Integrations.
 * Defines capabilities, credentials fields, and workflow bindings across all external softwares.
 */

export type IntegrationCategory = "all" | "ehr" | "crm" | "telephony" | "mailbox" | "sms" | "marketing";

export type SyncModuleGroup = "appointments" | "leads" | "rcm" | "clinical";

export interface SyncCapability {
  id: string;
  label: string;
  description: string;
  module: SyncModuleGroup;
  hasWorkflow: boolean;
  defaultWorkflowName?: string;
  direction: "two-way" | "inbound" | "outbound";
  syncedFields?: string[];
}

export interface IntegrationField {
  name: string;
  label: string;
  type?: "text" | "password" | "select" | "toggle";
  placeholder?: string;
  tooltip?: string;
  readonly?: boolean;
  defaultValue?: string;
  options?: { label: string; value: string }[];
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  badge?: string;
  brandColor?: string;
  accentBg?: string;
  docsUrl?: string;
  syncMechanism: "polling" | "webhook" | "hybrid";
  defaultSyncInterval: "5m" | "15m" | "30m" | "1h";
  fields: IntegrationField[];
  capabilities: SyncCapability[];
}

export interface IntegrationSyncConfig {
  connected: boolean;
  credentials: Record<string, string>;
  syncInterval: "5m" | "15m" | "30m" | "1h";
  lastSyncAt?: string;
  syncStatus?: "idle" | "syncing" | "success" | "error";
  syncError?: string;
  features: Record<string, { enabled: boolean; workflowId?: string; direction?: "two-way" | "inbound" | "outbound" }>;
}

export interface SyncLogEntry {
  id: string;
  integrationId: string;
  timestamp: string;
  module: string;
  action: string;
  status: "success" | "failed" | "skipped";
  itemsCount: number;
  message: string;
  endpoint?: string;
  httpStatus?: number;
  latencyMs?: number;
  payload?: Record<string, any>;
}

// ── Standard Capabilities Library ───────────────────────────────────────────
export const STANDARD_CAPABILITIES: Record<string, SyncCapability> = {
  // Appointments
  "appointments.booking": {
    id: "appointments.booking",
    label: "Help setup appointments",
    description: "AI Receptionist & patient portal book appointments directly into external calendar",
    module: "appointments",
    hasWorkflow: false,
    direction: "two-way",
    syncedFields: ["Patient Name", "Phone", "Slot Time", "Service Type", "Practitioner"],
  },
  "appointments.reminders": {
    id: "appointments.reminders",
    label: "Give appointment reminders",
    description: "Trigger automated SMS/WhatsApp reminder notifications prior to scheduled visits",
    module: "appointments",
    hasWorkflow: true,
    defaultWorkflowName: "Appointment Reminders Workflow",
    direction: "outbound",
    syncedFields: ["Mobile Phone", "Start Time", "Clinic Address", "Confirmation Status"],
  },
  "appointments.feedback": {
    id: "appointments.feedback",
    label: "Client feedbacks / Referrals",
    description: "Automate post-appointment patient satisfaction surveys & Google review prompts",
    module: "appointments",
    hasWorkflow: true,
    defaultWorkflowName: "Post-Consultation Feedback Workflow",
    direction: "outbound",
    syncedFields: ["Patient Email", "Phone", "NPS Rating", "Review Link"],
  },
  "appointments.calendar_sync": {
    id: "appointments.calendar_sync",
    label: "Sync appointments in the PMS / EHR",
    description: "Bidirectional calendar synchronization ensuring doctor rosters & slots match 1:1",
    module: "appointments",
    hasWorkflow: false,
    direction: "two-way",
    syncedFields: ["Roster Availability", "Room Allocations", "Status Flags"],
  },

  // Leads
  "leads.call_leads": {
    id: "leads.call_leads",
    label: "Call Google, FB & Ads leads",
    description: "Auto-trigger instant outbound call or WhatsApp intake when a new lead is captured",
    module: "leads",
    hasWorkflow: true,
    defaultWorkflowName: "Instant Lead Outreach Workflow",
    direction: "inbound",
    syncedFields: ["Full Name", "Phone", "Campaign ID", "Source Form", "UTM Tags"],
  },
  "leads.client_sync": {
    id: "leads.client_sync",
    label: "Sync patient demographics",
    description: "Bidirectional sync of contact information, medical history & client files",
    module: "leads",
    hasWorkflow: false,
    direction: "two-way",
    syncedFields: ["First/Last Name", "DOB", "Mobile", "Email", "Emergency Contact"],
  },

  // RCM & Billing
  "rcm.invoices": {
    id: "rcm.invoices",
    label: "Sync visits to invoices / superbills",
    description: "Generate invoice draft in MantraAssist RCM immediately after appointment completion",
    module: "rcm",
    hasWorkflow: true,
    defaultWorkflowName: "Completed Visit RCM Invoicing Workflow",
    direction: "outbound",
    syncedFields: ["Visit ID", "CPT Codes", "Itemized Fees", "Superbill PDF"],
  },
  "rcm.payments": {
    id: "rcm.payments",
    label: "Payment & balance sync",
    description: "Reflect payments, credit balances, copays, and receipts across systems",
    module: "rcm",
    hasWorkflow: false,
    direction: "two-way",
    syncedFields: ["Payment Method", "Amount", "Balance Due", "Receipt Number"],
  },

  // Clinical & Forms
  "clinical.forms": {
    id: "clinical.forms",
    label: "Intake forms & questionnaires",
    description: "Send pre-visit intake forms and sync completed responses into patient chart",
    module: "clinical",
    hasWorkflow: true,
    defaultWorkflowName: "Patient Intake Form Workflow",
    direction: "two-way",
    syncedFields: ["Questionnaire Answers", "Digital Signature", "Consent Flags"],
  },
  "clinical.telehealth": {
    id: "clinical.telehealth",
    label: "Telehealth & video visit links",
    description: "Generate and send secure virtual room links when appointment is confirmed",
    module: "clinical",
    hasWorkflow: false,
    direction: "two-way",
    syncedFields: ["Video Meeting URL", "Access Pin", "Duration Minutes"],
  },
};

// ── Integration Definitions ────────────────────────────────────────────────
export const INTEGRATIONS_REGISTRY: IntegrationDefinition[] = [
  // 1. Cliniko (EHR)
  {
    id: "cliniko",
    name: "Cliniko",
    description: "Allied health practice management software for patients, appointments & billing",
    category: "ehr",
    badge: "Popular in UK & AU",
    brandColor: "#2B4B80",
    accentBg: "#F0F4FA",
    docsUrl: "https://help.cliniko.com/en/articles/api-keys",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      {
        name: "apiKey",
        label: "Cliniko API Key *",
        type: "password",
        placeholder: "Enter Cliniko API key (e.g. MS0x...)",
        tooltip: "Found in Cliniko Settings → API Keys → Add an API Key",
      },
      {
        name: "shard",
        label: "Cliniko Shard / Region *",
        type: "select",
        defaultValue: "uk1",
        options: [
          { label: "United Kingdom (uk1.cliniko.com)", value: "uk1" },
          { label: "Australia / APAC (au1.cliniko.com)", value: "au1" },
          { label: "United States (us1.cliniko.com)", value: "us1" },
        ],
        tooltip: "Select your regional Cliniko data center",
      },
      {
        name: "businessId",
        label: "Account ID / Vendor ID (Optional)",
        placeholder: "e.g. 123456",
        tooltip: "Optional identifier for multi-location clinics",
      },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.feedback"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
      STANDARD_CAPABILITIES["rcm.payments"],
      STANDARD_CAPABILITIES["clinical.forms"],
    ],
  },

  // 2. Healthie (EHR)
  {
    id: "healthie",
    name: "Healthie",
    description: "Comprehensive EHR, telehealth, and coaching platform for dietetics & wellness",
    category: "ehr",
    badge: "Telehealth Ready",
    brandColor: "#764ABC",
    accentBg: "#F5F0FB",
    docsUrl: "https://help.gethealthie.com/article/developer-api",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      {
        name: "apiKey",
        label: "Healthie API Key *",
        type: "password",
        placeholder: "Enter your Healthie API Key",
        tooltip: "Generated in Healthie Settings → Integrations → Developer API",
      },
      {
        name: "environment",
        label: "Environment *",
        type: "select",
        defaultValue: "production",
        options: [
          { label: "Production (api.gethealthie.com)", value: "production" },
          { label: "Staging / Sandbox (staging-api.gethealthie.com)", value: "staging" },
        ],
        tooltip: "Select sandbox or production environment",
      },
      {
        name: "providerId",
        label: "Organization / Provider ID *",
        placeholder: "e.g. 987654",
        tooltip: "Your main practitioner or organization ID in Healthie",
      },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["clinical.telehealth"],
      STANDARD_CAPABILITIES["clinical.forms"],
      STANDARD_CAPABILITIES["rcm.invoices"],
      STANDARD_CAPABILITIES["rcm.payments"],
    ],
  },

  // 3. Phorest (CRM & Clinic Management)
  {
    id: "phorest",
    name: "Phorest",
    description: "Salon & clinic management software for client records, bookings, and staff rosters",
    category: "crm",
    badge: "Aesthetic Clinics",
    syncMechanism: "polling",
    defaultSyncInterval: "15m",
    fields: [
      {
        name: "username",
        label: "API Username *",
        placeholder: "e.g. global/your_email@domain.com",
        tooltip: "Phorest API username (must start with 'global/' prefix)",
      },
      {
        name: "password",
        label: "API Password / Secret *",
        type: "password",
        placeholder: "Enter Phorest API password",
        tooltip: "Secret password issued by Phorest API support",
      },
      {
        name: "businessId",
        label: "Business ID *",
        placeholder: "e.g. Xf7saoBpuqy2t0RRIkBpXg",
        tooltip: "Your unique Phorest business UUID",
      },
      {
        name: "region",
        label: "Gateway Region *",
        type: "select",
        defaultValue: "EU",
        options: [
          { label: "United Kingdom & Europe (api-gateway-eu.phorest.com)", value: "EU" },
          { label: "North America & Australia (api-gateway-us.phorest.com)", value: "US" },
        ],
        tooltip: "Server gateway routing your clinic data",
      },
      {
        name: "branchId",
        label: "Default Branch ID (Optional)",
        placeholder: "e.g. hPfzdyamWjxp9GzYVUETRg (leave blank to auto-detect)",
        tooltip: "Optional branch location ID. Blank auto-detects primary branch.",
      },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.feedback"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.call_leads"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
    ],
  },

  // 4. Epic (EHR)
  {
    id: "epic",
    name: "Epic",
    description: "Enterprise hospital & health system software with FHIR APIs",
    category: "ehr",
    badge: "Enterprise",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      { name: "clientId", label: "Client ID *", placeholder: "Enter Epic Client ID" },
      { name: "clientSecret", label: "Client Secret *", type: "password", placeholder: "Enter Client Secret" },
      { name: "fhirBaseUrl", label: "FHIR Base URL *", placeholder: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
    ],
  },

  // 5. Athena Health (EHR)
  {
    id: "athena",
    name: "Athena Health",
    description: "Cloud-based EHR, medical billing, and practice management",
    category: "ehr",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      { name: "clientId", label: "Client ID *", placeholder: "Enter Athena Client ID" },
      { name: "clientSecret", label: "Client Secret *", type: "password", placeholder: "Enter Client Secret" },
      { name: "practiceId", label: "Practice ID *", placeholder: "e.g. 195900" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
    ],
  },

  // 6. MantraCare (Native EHR)
  {
    id: "mantracare",
    name: "MantraCare",
    description: "Mantra internal electronic health records and clinical workflow suite",
    category: "ehr",
    badge: "Native",
    syncMechanism: "hybrid",
    defaultSyncInterval: "5m",
    fields: [
      { name: "apiKey", label: "API Key", placeholder: "Enter API key" },
      { name: "apiSecret", label: "API Secret", type: "password", placeholder: "Enter API secret" },
      { name: "endpointUrl", label: "Endpoint URL", placeholder: "https://api.mantracare.com" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.booking"],
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.feedback"],
      STANDARD_CAPABILITIES["appointments.calendar_sync"],
      STANDARD_CAPABILITIES["leads.call_leads"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
      STANDARD_CAPABILITIES["rcm.payments"],
      STANDARD_CAPABILITIES["clinical.forms"],
      STANDARD_CAPABILITIES["clinical.telehealth"],
    ],
  },

  // 7. Salesforce (CRM)
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise cloud CRM for accounts, opportunities, and custom healthcare objects",
    category: "crm",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      { name: "apiUrl", label: "API URL *", placeholder: "https://yourcompany.my.salesforce.com/services/data/v58.0" },
      { name: "authorizationToken", label: "Bearer Token *", type: "password", placeholder: "Enter OAuth Bearer Token" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["leads.call_leads"],
      STANDARD_CAPABILITIES["leads.client_sync"],
      STANDARD_CAPABILITIES["rcm.invoices"],
    ],
  },

  // 8. HubSpot (CRM)
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Inbound marketing, sales pipelines, and customer support CRM",
    category: "crm",
    syncMechanism: "hybrid",
    defaultSyncInterval: "15m",
    fields: [
      { name: "apiKey", label: "Private App Token / Access Token *", type: "password", placeholder: "pat-na1-..." },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["leads.call_leads"],
      STANDARD_CAPABILITIES["leads.client_sync"],
    ],
  },

  // 9. Bitrix 24 (CRM)
  {
    id: "bitrix24",
    name: "Bitrix 24",
    description: "CRM and collaboration platform with deal pipelines",
    category: "crm",
    syncMechanism: "polling",
    defaultSyncInterval: "15m",
    fields: [
      { name: "apiUrl", label: "REST Webhook URL *", placeholder: "https://company.bitrix24.com/rest/1/xxxx/" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["leads.call_leads"],
      STANDARD_CAPABILITIES["leads.client_sync"],
    ],
  },

  // 10. Meta Lead Ads (Marketing)
  {
    id: "meta-leads",
    name: "Meta Lead Ads",
    description: "Pull leads from Facebook & Instagram ad campaigns with instant AI voice callback",
    category: "marketing",
    badge: "Instant Calls",
    syncMechanism: "webhook",
    defaultSyncInterval: "5m",
    fields: [
      { name: "appId", label: "Meta App ID *", placeholder: "Enter App ID" },
      { name: "appSecret", label: "Meta App Secret *", type: "password", placeholder: "Enter App Secret" },
      { name: "pageAccessToken", label: "Page Access Token *", type: "password", placeholder: "Enter Token" },
      { name: "adAccountId", label: "Ad Account ID *", placeholder: "act_..." },
      { name: "pageId", label: "Facebook Page ID *", placeholder: "Enter Page ID" },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["leads.call_leads"],
    ],
  },

  // 11. WhatsApp Business (Marketing & Messaging)
  {
    id: "whatsapp-business",
    name: "WhatsApp Business",
    description: "Official Meta Cloud API for customer conversations and verified message templates",
    category: "marketing",
    badge: "Official Cloud API",
    syncMechanism: "webhook",
    defaultSyncInterval: "5m",
    fields: [
      { name: "phoneNumberId", label: "Phone Number ID *", placeholder: "Enter Phone Number ID" },
      { name: "wabaId", label: "WhatsApp Business Account ID *", placeholder: "Enter WABA ID" },
      { name: "accessToken", label: "System User Token *", type: "password", placeholder: "EAA..." },
    ],
    capabilities: [
      STANDARD_CAPABILITIES["appointments.reminders"],
      STANDARD_CAPABILITIES["appointments.feedback"],
    ],
  },
];

// ── LocalStorage Helpers ───────────────────────────────────────────────────
const STORAGE_PREFIX = "mantra_integration_config_";
const LOGS_STORAGE_PREFIX = "mantra_integration_logs_";

export function getStoredIntegrationConfig(integrationId: string): IntegrationSyncConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${integrationId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load integration config:", e);
  }
  
  // Return default template
  const def = INTEGRATIONS_REGISTRY.find((i) => i.id === integrationId);
  const defaultFeatures: Record<string, { enabled: boolean; workflowId?: string; direction?: any }> = {};
  def?.capabilities.forEach((cap) => {
    defaultFeatures[cap.id] = {
      enabled: cap.module === "appointments" || cap.module === "leads",
      direction: cap.direction,
    };
  });

  return {
    connected: false,
    credentials: {},
    syncInterval: def?.defaultSyncInterval || "15m",
    features: defaultFeatures,
  };
}

export function saveStoredIntegrationConfig(integrationId: string, config: IntegrationSyncConfig): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${integrationId}`, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("mantra:integration_updated", { detail: { integrationId, config } }));
  } catch (e) {
    console.error("Failed to save integration config:", e);
  }
}

export function getStoredSyncLogs(integrationId: string): SyncLogEntry[] {
  try {
    const raw = localStorage.getItem(`${LOGS_STORAGE_PREFIX}${integrationId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load sync logs:", e);
  }

  if (integrationId === "phorest") {
    return [
      {
        id: "log-ph-1",
        integrationId: "phorest",
        timestamp: "10:48 AM",
        module: "Appointments",
        action: "Delta Schedule Pull",
        status: "success",
        itemsCount: 12,
        message: "Retrieved 12 booked visits for Swiss Care Clinic",
        endpoint: "GET /api-gateway/v2/business/qjqSM2Q_ThtV-pl5ECVmyg/appointment",
        httpStatus: 200,
        latencyMs: 148,
        payload: {
          businessId: "qjqSM2Q_ThtV-pl5ECVmyg",
          itemsSynced: 12,
          window: "2026-11-04 00:00:00 to 2026-11-05 23:59:59",
          syncEngine: "MantraAssist Delta Poller v2.4",
        },
      },
      {
        id: "log-ph-2",
        integrationId: "phorest",
        timestamp: "10:45 AM",
        module: "Clients",
        action: "External Link Verification",
        status: "failed",
        itemsCount: 0,
        message: "Call to the external system failed with 500 status code",
        endpoint: "GET /api-gateway/v2/business/qjqSM2Q_ThtV-pl5ECVmyg/client",
        httpStatus: 500,
        latencyMs: 312,
        payload: {
          statusCode: 500,
          id: "bf690345-1e80-4f8a-bb45-6061a93ae526",
          detail: "Call to the external system failed with 500 status code",
          resolution: "Notify api-requests@phorest.com with correlation ID bf690345 to enable database routing.",
        },
      },
    ];
  }

  return [
    {
      id: `log-${Date.now() - 300000}`,
      integrationId,
      timestamp: new Date(Date.now() - 300000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      module: "Appointments",
      action: "Delta Schedule Pull",
      status: "success",
      itemsCount: 14,
      message: "Synced 14 upcoming appointment slots and practitioner schedules",
      endpoint: "GET /v1/appointments?updated_since=PT15M",
      httpStatus: 200,
      latencyMs: 132,
      payload: {
        recordsReceived: 14,
        reconciledNew: 3,
        updated: 11,
        syncMode: "IncrementalDelta",
      },
    },
    {
      id: `log-${Date.now() - 1800000}`,
      integrationId,
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      module: "Clients",
      action: "Demographic Records Sync",
      status: "success",
      itemsCount: 6,
      message: "Updated 6 patient records with normalized phone numbers",
      endpoint: "GET /v1/patients?limit=50",
      httpStatus: 200,
      latencyMs: 185,
      payload: {
        recordsChecked: 50,
        demographicsUpdated: 6,
        duplicatesResolved: 0,
      },
    },
  ];
}

export function addSyncLog(integrationId: string, log: Omit<SyncLogEntry, "id">): void {
  const current = getStoredSyncLogs(integrationId);
  const updated = [{ ...log, id: `log-${Date.now()}` }, ...current].slice(0, 50);
  try {
    localStorage.setItem(`${LOGS_STORAGE_PREFIX}${integrationId}`, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to append sync log:", e);
  }
}

