/**
 * maClient.ts
 * Path: src/reception/lib/api/maClient.ts
 *
 * Single Contract Interface between Reception surfaces and MantraAssist.
 * Includes factory getMaClient() providing the active client implementation.
 */

import type {
  Station,
  PatientSummary,
  CreatePatientPayload,
  ServiceItem,
  ProviderItem,
  TimeSlot,
  AppointmentSummary,
  BookAppointmentPayload,
  Journey,
  ProcessStageDef,
  QueueTicket,
  QueueEvent,
  DisplayEvent,
  PatientInvoiceSummary,
  ReceptionAuditEvent,
} from '../../types/reception';
import { MockMaClient } from './mockMaClient';

export interface IMaClient {
  // Device & Auth
  authenticateDevice(deviceKey: string): Promise<{ deviceId: string; orgId: string; token: string }>;
  deviceHeartbeat(deviceId: string, status: 'online' | 'offline'): Promise<void>;
  getStations(orgId?: string): Promise<Station[]>;

  // OTP & Identity
  sendOtp(phone: string): Promise<{ success: boolean; expiresAt: string }>;
  verifyOtp(phone: string, otp: string): Promise<{ success: boolean; sessionToken: string }>;
  lookupClientsByPhone(phone: string, sessionToken?: string): Promise<PatientSummary[]>;
  createWalkInClient(data: CreatePatientPayload, sessionToken?: string): Promise<PatientSummary>;

  // Booking & Appointments (with Idempotency Keys)
  getTodayAppointments(clientId: string, sessionToken?: string): Promise<AppointmentSummary[]>;
  getServices(orgId?: string): Promise<ServiceItem[]>;
  getProviders(orgId?: string, serviceId?: string): Promise<ProviderItem[]>;
  getSlots(serviceId: string, date: string, providerId?: string): Promise<TimeSlot[]>;
  bookAppointment(data: BookAppointmentPayload, sessionToken?: string, idempotencyKey?: string): Promise<AppointmentSummary>;
  checkinAppointment(appointmentId: string, clientId: string, sessionToken?: string, idempotencyKey?: string): Promise<{ journey: Journey; ticket: QueueTicket }>;
  checkinByQrCode(qrPayload: string, sessionToken?: string, idempotencyKey?: string): Promise<{ journey: Journey; ticket: QueueTicket }>;
  checkinWalkIn(payload: {
    patient: { name: string; phone: string; dob?: string };
    reason?: string;
    processId?: string;
    kioskId?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; ticket: QueueTicket; journey: Journey }>;

  // Journey & Templates
  getDefaultJourneyTemplate(serviceId: string, orgId?: string): Promise<ProcessStageDef[]>;
  getJourney(journeyId: string): Promise<Journey>;

  // Queue Operations (completeTicket is the sole owner for lifecycle stage progression)
  getStationQueue(stationId: string): Promise<QueueTicket[]>;
  callNextTicket(stationId: string): Promise<QueueTicket | null>;
  recallTicket(ticketId: string): Promise<QueueTicket>;
  serveTicket(ticketId: string): Promise<QueueTicket>;
  completeTicket(ticketId: string, nextStageIds?: string[], idempotencyKey?: string): Promise<{ journey: Journey; nextTickets: QueueTicket[] }>;
  skipTicket(ticketId: string, reason?: 'no_show' | 'left'): Promise<void>;
  requeueTicket(ticketId: string, priority?: 0 | 1 | 2): Promise<QueueTicket>;
  transferTicket(ticketId: string, targetStationId: string, priority?: 0 | 1 | 2): Promise<QueueTicket>;

  // Realtime Subscriptions & Mocked Notifications
  subscribeToQueue(stationId: string, callback: (event: QueueEvent) => void): () => void;
  subscribeToDisplay(stationGroupId: string, callback: (event: DisplayEvent) => void): () => void;
  sendTokenNotification(ticketId: string, phone: string, channel: 'sms' | 'whatsapp'): Promise<boolean>;

  // Voice & Knowledge Base Extensions (Prototypes with Web Speech / Simulated KB)
  processVoiceIntent(transcript: string, currentStep?: string): Promise<{ intent: string; slots: Record<string, string>; nextStep?: string }>;
  queryKnowledgeBase(query: string): Promise<Array<{ answer: string; confidence?: number; shouldEscalate?: boolean }>>;
  // Biometrics & Face Identification (Privacy-Preserving Prototype)
  saveFaceTemplate(clientId: string, template: number[], consentAt: string, source?: string): Promise<boolean>;
  matchFace(template: number[], threshold?: number): Promise<{ matched: boolean; client?: PatientSummary; confidence: number; multipleMatches?: boolean }>;
  matchFaceTemplate(capturedVector: number[], threshold?: number): Promise<{ matched: boolean; client?: PatientSummary; confidence: number; multipleMatches?: boolean }>;
  enrollFaceTemplate(clientId: string, vector: number[], consentGiven: boolean): Promise<boolean>;
  deleteFaceTemplate(clientId: string): Promise<boolean>;
  getFaceEnrollmentStatus(clientId: string): Promise<{ enrolled: boolean; enrolledAt?: string; consentAt?: string; enrolledVia?: string }>;

  // Visit Summary (Single Source of Truth from MA Process & Stations)
  getVisitSummary(clientId: string, appointmentId?: string): Promise<import('../../types/reception').VisitSummary>;

  // Configuration & Onboarding Defaults
  getDefaultOnboardingProcessId(): Promise<string>;
  setDefaultOnboardingProcessId(processId: string): Promise<void>;

  // Audit Logging
  logAuditEvent(event: ReceptionAuditEvent): Promise<void>;

  // Invoices & Billing
  getPatientInvoices(clientId: string): Promise<PatientInvoiceSummary[]>;
}

// Active singleton instance reference
let activeClientInstance: IMaClient | null = null;

export function setMaClient(client: IMaClient): void {
  activeClientInstance = client;
}

export function getMaClient(): IMaClient {
  if (!activeClientInstance) {
    activeClientInstance = new MockMaClient();
  }
  return activeClientInstance;
}
