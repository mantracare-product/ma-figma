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

export type SyncIntervalOption = "manual" | "5m" | "15m" | "30m" | "1h" | "custom";

export interface IntegrationFieldMapping {
  id: string;
  module: "client" | "appointment" | "clinical" | "custom";
  targetFieldKey: string;      // e.g. "name", "age", or custom field key
  targetFieldLabel: string;    // e.g. "Client Name", "Age"
  placeholderToken: string;    // e.g. "{client_name}", "{age}"
  incomingVariable: string;    // e.g. "firstName + ' ' + lastName", "mobile", "birthDate"
  sampleValue?: string;        // e.g. "abhishek", "32", "Nov 14, 2026"
  isCustom?: boolean;
}

export interface IntegrationSyncConfig {
  connected: boolean;
  credentials: Record<string, string>;
  syncInterval: SyncIntervalOption;
  customSyncValue?: number;
  customSyncUnit?: "minutes" | "hours";
  lastSyncAt?: string;
  syncStatus?: "idle" | "syncing" | "success" | "error";
  syncError?: string;
  features: Record<string, { enabled: boolean; workflowId?: string; direction?: "two-way" | "inbound" | "outbound" }>;
  fieldMappings?: Record<string, IntegrationFieldMapping>;
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

// ── Field Mapping Defaults & Helpers ───────────────────────────────────────
export function getDefaultFieldMappings(integrationId?: string): Record<string, IntegrationFieldMapping> {
  const isCliniko = integrationId === "cliniko";
  const isHealthie = integrationId === "healthie";

  const list: IntegrationFieldMapping[] = [
    {
      id: "fm_client_name",
      module: "client",
      targetFieldKey: "name",
      targetFieldLabel: "Client Name",
      placeholderToken: "{client_name}",
      incomingVariable: isCliniko
        ? "patient.first_name + ' ' + patient.last_name"
        : isHealthie
        ? "user.first_name + ' ' + user.last_name"
        : "firstName + ' ' + lastName",
      sampleValue: "abhishek",
    },
    {
      id: "fm_age",
      module: "client",
      targetFieldKey: "age",
      targetFieldLabel: "Age",
      placeholderToken: "{age}",
      incomingVariable: isCliniko ? "patient.age" : isHealthie ? "user.age" : "client.age || birthDate",
      sampleValue: "32",
    },
    {
      id: "fm_current_date",
      module: "appointment",
      targetFieldKey: "current_date",
      targetFieldLabel: "Current Date",
      placeholderToken: "{current_date}",
      incomingVariable: "system.current_date || appointmentDate",
      sampleValue: "Nov 14, 2026",
    },
    {
      id: "fm_responsible",
      module: "appointment",
      targetFieldKey: "responsible",
      targetFieldLabel: "Responsible",
      placeholderToken: "{responsible}",
      incomingVariable: isCliniko
        ? "booking.practitioner_name"
        : isHealthie
        ? "appointment.provider.name"
        : "staffName || branch.name",
      sampleValue: "John Smith",
    },
    {
      id: "fm_diagnosis",
      module: "clinical",
      targetFieldKey: "diagnosis",
      targetFieldLabel: "Diagnosis",
      placeholderToken: "{diagnosis}",
      incomingVariable: "categoryName || serviceName",
      sampleValue: "Regular Consultation",
    },
    {
      id: "fm_chief_complaint",
      module: "clinical",
      targetFieldKey: "chief_complaint",
      targetFieldLabel: "Chief Complaint",
      placeholderToken: "{chief_complaint}",
      incomingVariable: "serviceName || appointment.notes",
      sampleValue: "Regular Consultation",
    },
    {
      id: "fm_medications",
      module: "clinical",
      targetFieldKey: "medications",
      targetFieldLabel: "Medications",
      placeholderToken: "{medications}",
      incomingVariable: "client.medicalHistory || chart_note.medications",
      sampleValue: "",
    },
    {
      id: "fm_phone",
      module: "client",
      targetFieldKey: "phone",
      targetFieldLabel: "Phone Number",
      placeholderToken: "{phone}",
      incomingVariable: isCliniko ? "patient.phone_numbers" : "mobile || telephone",
      sampleValue: "+44 7412 345678",
    },
    {
      id: "fm_email",
      module: "client",
      targetFieldKey: "email",
      targetFieldLabel: "Email Address",
      placeholderToken: "{email}",
      incomingVariable: "email",
      sampleValue: "abhishek@example.com",
    },
    {
      id: "fm_service_name",
      module: "appointment",
      targetFieldKey: "service_name",
      targetFieldLabel: "Service Name",
      placeholderToken: "{service_name}",
      incomingVariable: isCliniko ? "booking.service_name" : "serviceName",
      sampleValue: "Cons Anti-Wrinkle",
    },
    {
      id: "fm_notes",
      module: "appointment",
      targetFieldKey: "notes",
      targetFieldLabel: "Notes / Instructions",
      placeholderToken: "{notes}",
      incomingVariable: "notes || booking_notes",
      sampleValue: "First consultation and patch test",
    },
  ];

  const map: Record<string, IntegrationFieldMapping> = {};
  list.forEach((item) => {
    map[item.id] = item;
  });
  return map;
}

export function getKnownPayloadVariables(integrationId?: string): { key: string; label: string; token: string }[] {
  if (integrationId === "phorest") {
    return [
      { key: "firstName", label: "First Name", token: "{first_name}" },
      { key: "lastName", label: "Last Name", token: "{last_name}" },
      { key: "mobile", label: "Mobile Phone", token: "{mobile}" },
      { key: "email", label: "Email", token: "{email}" },
      { key: "birthDate", label: "Birth Date / DOB", token: "{dob}" },
      { key: "gender", label: "Gender", token: "{gender}" },
      { key: "serviceName", label: "Service Name", token: "{service_name}" },
      { key: "appointmentDate", label: "Appointment Date", token: "{appointment_date}" },
      { key: "startTime", label: "Start Time", token: "{start_time}" },
      { key: "staffName", label: "Staff / Provider", token: "{responsible}" },
      { key: "branchName", label: "Branch Name", token: "{branch_name}" },
      { key: "price", label: "Price / Fee", token: "{price}" },
      { key: "notes", label: "Booking Notes", token: "{notes}" },
    ];
  }
  if (integrationId === "cliniko") {
    return [
      { key: "patient.first_name", label: "Patient First Name", token: "{first_name}" },
      { key: "patient.last_name", label: "Patient Last Name", token: "{last_name}" },
      { key: "patient.phone_numbers", label: "Phone", token: "{phone}" },
      { key: "patient.email", label: "Email", token: "{email}" },
      { key: "patient.date_of_birth", label: "Date of Birth", token: "{dob}" },
      { key: "booking.service_name", label: "Service", token: "{service_name}" },
      { key: "booking.starts_at", label: "Start Time", token: "{start_time}" },
      { key: "booking.practitioner_name", label: "Practitioner", token: "{responsible}" },
      { key: "booking.notes", label: "Booking Notes", token: "{notes}" },
    ];
  }
  if (integrationId === "healthie") {
    return [
      { key: "user.first_name", label: "First Name", token: "{first_name}" },
      { key: "user.last_name", label: "Last Name", token: "{last_name}" },
      { key: "user.phone_number", label: "Phone", token: "{phone}" },
      { key: "user.email", label: "Email", token: "{email}" },
      { key: "appointment.appointment_type.name", label: "Appointment Type", token: "{service_name}" },
      { key: "appointment.datetime", label: "Date & Time", token: "{appointment_date}" },
      { key: "appointment.provider.name", label: "Provider", token: "{responsible}" },
      { key: "appointment.notes", label: "Notes", token: "{notes}" },
    ];
  }
  // Generic fallback
  return [
    { key: "client_name", label: "Full Name", token: "{client_name}" },
    { key: "phone", label: "Phone", token: "{phone}" },
    { key: "email", label: "Email", token: "{email}" },
    { key: "age", label: "Age", token: "{age}" },
    { key: "current_date", label: "Current Date", token: "{current_date}" },
    { key: "responsible", label: "Responsible", token: "{responsible}" },
    { key: "diagnosis", label: "Diagnosis", token: "{diagnosis}" },
    { key: "chief_complaint", label: "Chief Complaint", token: "{chief_complaint}" },
    { key: "medications", label: "Medications", token: "{medications}" },
    { key: "service_name", label: "Service Name", token: "{service_name}" },
    { key: "appointment_date", label: "Appointment Date", token: "{appointment_date}" },
    { key: "notes", label: "Notes", token: "{notes}" },
  ];
}

// ── LocalStorage Helpers ───────────────────────────────────────────────────
const STORAGE_PREFIX = "mantra_integration_config_";
const LOGS_STORAGE_PREFIX = "mantra_integration_logs_";

export function getStoredIntegrationConfig(integrationId: string): IntegrationSyncConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${integrationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.fieldMappings || Object.keys(parsed.fieldMappings).length === 0) {
        parsed.fieldMappings = getDefaultFieldMappings(integrationId);
      }
      return parsed;
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
    fieldMappings: getDefaultFieldMappings(integrationId),
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

export function formatSyncSchedule(config: IntegrationSyncConfig): string {
  if (config.syncInterval === "manual") return "Manual only";
  if (config.syncInterval === "5m") return "Every 5 mins";
  if (config.syncInterval === "15m") return "Every 15 mins";
  if (config.syncInterval === "30m") return "Every 30 mins";
  if (config.syncInterval === "1h") return "Every 1 hour";
  if (config.syncInterval === "custom") {
    const val = config.customSyncValue || 20;
    const unit = config.customSyncUnit || "minutes";
    return `Every ${val} ${val === 1 ? unit.replace(/s$/, "") : unit}`;
  }
  return "Every 15 mins";
}

export async function runIntegrationManualSync(
  integrationId: string,
  scope: "all" | "clients" | "appointments" = "all"
): Promise<{ itemsCount: number; message: string }> {
  const def = INTEGRATIONS_REGISTRY.find((i) => i.id === integrationId);
  const name = def?.name || integrationId;
  const current = getStoredIntegrationConfig(integrationId);

  await new Promise((resolve) => setTimeout(resolve, 900));

  const itemsCount = scope === "clients" ? 12 : scope === "appointments" ? 8 : 10;
  const moduleLabel = scope === "clients" ? "Clients" : scope === "appointments" ? "Appointments" : "Manual Sync";
  const actionLabel = scope === "clients" ? "Manual Client Pull" : scope === "appointments" ? "Manual Appointment Pull" : "Full Delta Reconcile";
  const message = `Synced ${itemsCount} ${scope === "all" ? "records" : scope} from ${name}`;

  const updatedConfig: IntegrationSyncConfig = {
    ...current,
    lastSyncAt: new Date().toISOString(),
    syncStatus: "success",
  };
  saveStoredIntegrationConfig(integrationId, updatedConfig);

  addSyncLog(integrationId, {
    integrationId,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    module: moduleLabel,
    action: actionLabel,
    status: "success",
    itemsCount,
    message,
    endpoint: scope === "clients" ? "/api/v2/client" : scope === "appointments" ? "/api/v2/appointment" : "/api/v2/delta",
    httpStatus: 200,
    latencyMs: 142,
    payload: {
      trigger: "MANUAL_UI_TRIGGER",
      scope,
      itemsSynced: itemsCount,
      syncedAt: updatedConfig.lastSyncAt,
    },
  });

  return { itemsCount, message };
}

