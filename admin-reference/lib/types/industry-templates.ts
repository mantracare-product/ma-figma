// ==========================================
// SUPER ADMIN INDUSTRY TEMPLATE & PROVISIONING TYPES
// ==========================================

export interface IndustryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Lucide icon name
  displayOrder: number;
  isActive: boolean;
  industriesCount?: number;
}

export interface Industry {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  description: string;
  recommendedTone: string; // e.g., "Compassionate, Clinical", "Authoritative, Sharp"
  badges: string[]; // e.g., ['Popular', 'HIPAA Ready', 'TCPA Compliant']
  isActive: boolean;
  bundleId?: string;
  isSystemRecord?: boolean;
}

// ==========================================
// 2. PROCESS & STAGE TEMPLATES (STRICTLY BASIC + ADVANCED TABS)
// ==========================================
export interface ProcessGlobalSettings {
  aiModel: string; // e.g., 'gemini-2.5-flash', 'gpt-4o-mini', 'deepseek-v4-flash'
  voiceSpeed: number; // 0.8 to 1.4
  voiceGender: 'male' | 'female' | 'neutral';
  voiceTone: string; // e.g. "Warm & Empathetic", "Professional & Clinical", "Confident & Energetic"
  recordCalls: boolean;
  maxDurationMinutes: number;
  wrapUpWindowSeconds: number;
  retryRules: {
    enabled: boolean;
    maxAttempts: number;
    delayMinutes: number;
  };
  skipDayRules: {
    enabled: boolean;
    skipDaysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
    skipHolidays: boolean;
  };
  voicemailDetection: {
    enabled: boolean;
    action: 'hangup' | 'leave_message';
    voicemailMessage?: string;
  };
}

export interface StageWebhook {
  id: string;
  name: string;
  triggerEvent: 'stage_entry' | 'stage_exit' | 'call_completed' | 'call_failed';
  url: string;
  method?: 'POST' | 'GET';
  secretToken?: string;
  isEnabled: boolean;
}

export interface StageTemplate {
  id: string;
  stageOrder: number;
  name: string;
  stageCode?: string;
  goal?: string;
  description?: string;
  statusColor?: string; // e.g. '#10b981', '#3b82f6', '#f59e0b', '#ef4444', etc.
  automaticCalling?: boolean;
  defaultLanding?: boolean;

  // TAB 2: AI PROMPTS
  systemInstruction?: string;

  // TAB 3: AI SETTINGS
  aiModel?: string;
  speechSpeed?: number; // 0.5 to 2.0
  voiceEngine?: string; // e.g. 'av-Vikas', 'en-US-Journey-F'

  // TAB 4: WEBHOOKS
  webhooks?: StageWebhook[];

  // TAB 5: ADVANCED
  skipHolidays?: boolean;
  duplicateLogic?: boolean;
  retryLimit?: number;
  intervalDelayMinutes?: number;
  nextStageOnRetryExhausted?: string;

  // Legacy fallback support
  basic?: {
    callAction?: 'ai_receives_calls' | 'ai_makes_calls' | 'transfer_to_human' | 'no_call';
    greetingPhrase?: string;
    callerPitch?: string;
    targetObjective?: string;
  };
  advanced?: {
    overrideAiModel?: boolean;
    aiModel?: string;
    voiceSpeed?: number;
    overrideDuration?: boolean;
    maxDurationMinutes?: number;
    overrideRetryRules?: boolean;
    retryAttempts?: number;
    retryDelayMinutes?: number;
    overrideSkipDays?: boolean;
    allowWeekendCalling?: boolean;
    overrideVoicemail?: boolean;
    detectVoicemail?: boolean;
    voicemailAction?: 'hangup' | 'leave_message';
    voicemailMessage?: string;
    recordCall?: boolean;
  };
}

export interface ProcessTemplate {
  id: string;
  industryId: string;
  industryName?: string;
  name: string;
  description: string;
  globalSettings: ProcessGlobalSettings;
  stages: StageTemplate[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. WEB FORM TEMPLATES
// ==========================================
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'currency'
  | 'date'
  | 'time'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'page_break'
  | 'section_break'
  | 'html';

export interface FormFieldTemplate {
  id: string;
  label: string;
  name: string; // mapped CRM field identifier / API Variable
  type: FormFieldType;
  placeholder?: string;
  helperText?: string;
  isRequired: boolean;
  options?: { label: string; value: string }[];
  validationRegex?: string;
  crmFieldMapping?: string;
  fieldSource?: 'standard' | 'system' | 'custom';
  sourceModule?: string;
  systemFieldKey?: string;
  minCharacters?: number | string;
  maxCharacters?: number | string;
  conditionalLogic?: {
    enabled?: boolean;
    dependsOnFieldId?: string;
    operator?: 'equals' | 'not_equals' | 'contains' | 'is_filled';
    value?: string;
  };
}

export interface FormSectionTemplate {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldTemplate[];
}

export interface FormTemplate {
  id: string;
  categoryId?: string;
  categoryName?: string;
  industryId: string;
  industryName?: string;
  title: string;
  slug?: string;
  category: 'lead_capture' | 'intake' | 'booking' | 'quote' | 'feedback';
  description: string;
  estimatedMinutes: number;
  sections: FormSectionTemplate[];
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  autoCreateClient: boolean;
  notificationEmail?: string;
  notificationSms?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. DOCUMENT TEMPLATES (CLINICAL, LEGAL & OPERATIONAL)
// ==========================================
export type DocumentCreationMethod = 'import_doc' | 'import_webform' | 'custom';

export interface DocumentFieldMapping {
  placeholder: string;       // e.g. "patient_name" or "{{patient_name}}"
  mappedVariable: string;    // e.g. "client_name" or "appointment_date"
  label?: string;
  fieldSource?: 'system' | 'custom' | 'webform';
}

export interface DocumentAutoNumbering {
  enabled: boolean;
  prefix: string;            // e.g. "DOC-", "MED-", "REF-"
  sequenceDigits: number;    // e.g. 4 -> 0001
  currentNumber: number;     // e.g. 1001
  suffix?: string;           // e.g. "-2026", "-MED"
}

export interface DocumentTemplate {
  id: string;
  categoryId?: string;
  categoryName?: string;
  industryId: string;
  industryName: string;
  serviceId?: string;
  serviceName?: string;
  name: string;              // Document Name e.g. "Patient Informed Consent & Treatment Authorization"
  title?: string;            // Fallback alias for name
  description: string;       // Purpose & description of document
  creationMethod: DocumentCreationMethod;
  sourceFileName?: string;
  sourceWebFormId?: string;
  contentHtml: string;
  extractedFields: DocumentFieldMapping[];
  autoNumbering: DocumentAutoNumbering;
  createdAt: string;
  updatedAt: string;
  // Backward compatibility fields
  tags?: string[];
  docType?: string;
  markdownContent?: string;
  keyQueryTriggers?: string[];
  suggestedAnswers?: string;
  escalationRules?: string;
}

// ==========================================
// 5. SERVICES & CUSTOM CRM FIELDS
// ==========================================
export interface DefaultServiceTemplate {
  id: string;
  industryId?: string;
  name: string;
  durationMinutes: number;
  priceEstimate?: number;
  description: string;
  category?: string;
  isPopular?: boolean;
}

export interface CustomFieldTemplate {
  id: string;
  industryId?: string;
  name: string;
  key: string;
  type: 'Text' | 'Number' | 'Boolean (Yes/No)' | 'Date' | 'Select (Dropdown)';
  entity: 'Client' | 'Deal / Opportunity' | 'Call Log' | 'Appointment';
  options?: string[];
  isRequired: boolean;
  description?: string;
}

// ==========================================
// 6. MASTER INDUSTRY STARTER BUNDLE
// ==========================================
export interface IndustryStarterBundle {
  id: string;
  industryId: string;
  industryName: string;
  categoryName: string;
  industries?: string[];
  slug: string;
  version: string;
  status: 'published' | 'draft' | 'archived';
  recommendedTone: string;
  badges: string[];
  processTemplate: ProcessTemplate;
  formTemplates: FormTemplate[];
  documentTemplates: DocumentTemplate[];
  defaultServices: DefaultServiceTemplate[];
  customFields: CustomFieldTemplate[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. ONBOARDING PROVISIONING TYPES
// ==========================================
export interface ProvisioningStepLog {
  id: string;
  step: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
  timestamp: string;
}

export interface ProvisionedWorkspace {
  id: string;
  orgName: string;
  subdomain: string;
  industryName: string;
  categoryName: string;
  bundleVersion: string;
  status: 'active' | 'provisioning' | 'failed';
  provisionedAt: string;
  clonedProcessCount: number;
  clonedStagesCount: number;
  clonedFormsCount: number;
  clonedDocsCount: number;
  clonedServicesCount: number;
  clonedCustomFieldsCount: number;
  aiAssistantReady: boolean;
}
