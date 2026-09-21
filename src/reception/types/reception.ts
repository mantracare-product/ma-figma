/**
 * reception.ts
 * Path: src/reception/types/reception.ts
 *
 * Core TypeScript definitions for Mantra AI Receptionist.
 * Fully decoupled from internal CRM stores and contexts.
 */

export type StageType = 'checkin' | 'consultation' | 'tests' | 'pharmacy' | 'billing' | 'custom';

export type StationType = 'doctor_room' | 'pharmacy' | 'lab' | 'billing' | 'desk';

export interface Station {
  id: string;
  orgId: string;
  name: string;
  type: StationType;
  providerId?: string;
  providerName?: string;
  roomNumber?: string;
  active: boolean;
  createdAt: string;
}

export interface KioskDevice {
  id: string;
  orgId: string;
  name: string;
  location: string;
  deviceKey: string;
  languages: string[];
  status: 'online' | 'offline' | 'active' | 'inactive';
  stationId?: string;
  lastSeenAt: string;
  registeredAt: string;
}

export interface ReceptionConfig {
  orgId: string;
  tokenPrefixes: {
    doctor: string;
    pharmacy: string;
    lab: string;
    billing: string;
    desk: string;
  };
  lateArrivalWindowMin: number; // default 15m
  earlyArrivalBufferMin: number; // default 30m
  queueAgingCapMin: number; // default 45m
  defaultLanguages: string[];
  defaultOnboardingProcessId?: string;
}

export interface ProcessStageDef {
  id?: string;
  stageId?: string;
  order: number;
  type?: StageType;
  stationType?: StationType;
  label?: string;
  name?: string;
  stationId?: string;
  stationName?: string;
  autoAdvance: boolean;
  isOptional?: boolean;
}

export interface JourneyStage {
  id?: string;
  stageId?: string;
  journeyId?: string;
  stageDefId?: string;
  label?: string;
  name?: string;
  type?: StageType;
  stationId?: string;
  status: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'skipped';
  enteredAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Journey {
  id: string;
  orgId: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  appointmentId?: string;
  processId: string;
  processName?: string;
  source: 'scheduled' | 'walk_in';
  status: 'active' | 'completed' | 'cancelled' | 'no_show';
  currentStatus?: string;
  currentStageId: string;
  activeStageIds: string[];
  stages?: JourneyStage[];
  startedAt: string;
  completedAt?: string;
}

export type QueueTicketStatus = 'waiting' | 'called' | 'serving' | 'done' | 'completed' | 'no_show' | 'cancelled';

export interface QueueTicket {
  id: string;
  orgId: string;
  stationId: string;
  stationName: string;
  journeyId: string;
  journeyStageId?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  tokenLabel: string; // e.g. "D-042"
  priority: number; // 0 normal/walk-in, 1 scheduled on-time/elderly, 2 urgent
  status: QueueTicketStatus;
  scheduledTime?: string;
  estimatedWaitMin?: number;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  createdAt: string;
  // UI & test aliases
  ticketNumber?: string;
  patientName?: string;
  patientId?: string;
  stageId?: string;
  joinedAt?: string;
}

export interface FaceTemplate {
  clientId: string;
  templateVector: number[];
  consentGiven: boolean;
  enrolledAt: string;
  confidenceScore?: number;
}

export interface VisitSummary {
  patient: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    maskedPhone: string;
    faceEnrolled?: boolean;
  };
  appointment: {
    id: string;
    serviceName: string;
    providerName?: string;
    date: string;
    time: string;
    status: string;
    source?: 'ai_receptionist' | 'kiosk' | 'call' | 'web';
  };
  room: {
    stationId: string;
    roomName: string;
    floorWing: string;
    directions: string;
    tokenLabel: string;
    estimatedWaitMin: number;
  };
}

export interface PatientSummary {
  id: string;
  name: string;
  phone: string;
  age?: number;
  gender?: string;
  email?: string;
  relation?: string; // e.g. "Self", "Spouse", "Child"
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
  faceConsentAt?: string;
  faceEnrolledVia?: string;
  faceTemplateVersion?: string;
  faceTemplate?: number[];
  createdVia?: 'ai_receptionist' | 'kiosk' | 'call' | 'web' | 'manual';
  defaultProcessId?: string;
}

export interface CreatePatientPayload {
  name: string;
  phone: string;
  age?: number;
  gender?: string;
  email?: string;
  reason?: string;
  relation?: string;
  faceEnrolled?: boolean;
  faceTemplate?: number[];
  consentGiven?: boolean;
  consentAt?: string;
  createdVia?: 'ai_receptionist' | 'kiosk' | 'call' | 'web';
}

export interface ServiceItem {
  id: string;
  orgId?: string;
  name: string;
  category?: string;
  description?: string;
  durationMin: number;
  price?: number;
  basePrice?: number;
  receptionEnabled?: boolean;
  defaultProcessId?: string;
}

export interface ProviderItem {
  id: string;
  orgId?: string;
  name: string;
  specialty?: string;
  specialization?: string;
  assignedStationId?: string;
  availableDays?: string[];
}

export interface TimeSlot {
  id: string;
  time?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  available: boolean;
  providerId?: string;
  serviceId?: string;
}

export interface AppointmentSummary {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  providerId?: string;
  providerName?: string;
  date: string;
  time: string;
  status: string;
  receptionEnabled?: boolean;
  checkedInAt?: string;
  journeyId?: string;
  source?: 'ai_receptionist' | 'kiosk' | 'call' | 'web';
  roomStationId?: string;
  roomName?: string;
  tokenNumber?: string;
}

export interface BookAppointmentPayload {
  clientId: string;
  serviceId: string;
  providerId?: string;
  date: string;
  time: string;
  reason?: string;
  isImmediateQueue?: boolean;
  source?: 'ai_receptionist' | 'kiosk' | 'call' | 'web';
}

export interface PatientInvoiceSummary {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partially_paid';
  dueDate?: string;
}

export type QueueEventType = 
  | 'TICKET_CREATED' 
  | 'TICKET_CALLED' 
  | 'TICKET_RECALLED' 
  | 'TICKET_SERVING' 
  | 'TICKET_COMPLETED' 
  | 'TICKET_SKIPPED' 
  | 'TICKET_REQUEUED' 
  | 'TICKET_TRANSFERRED'
  | 'QUEUE_TICKET_CREATED';

export interface QueueEvent {
  type: QueueEventType;
  stationId?: string;
  ticket?: QueueTicket;
  timestamp?: string;
  payload?: any;
}

export interface DisplayEvent {
  stationGroupId: string;
  nowServing: QueueTicket[];
  nextUp: QueueTicket[];
  lastCalledTicket?: QueueTicket;
  timestamp: string;
}

export interface ReceptionAuditEvent {
  id: string;
  orgId: string;
  deviceId?: string;
  userId?: string;
  clientId?: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
