# Design & Technical Blueprint: Mantra AI Receptionist

Companion to `AI_RECEPTIONIST_PRD.md`.

---

## 1. Single Product Surface

| Surface | Route | Role / Purpose | Users |
|---|---|---|---|
| **AI Receptionist** | `/reception` | Interactive avatar concierge for scheduled check-in & walk-in booking | Patients |
| **MA Admin Settings** | `/settings` > AI Reception | Manage clinic rooms, queue token rules, and default onboarding process | Clinic Admins |
| **MA Client Profile** | `/clients/:id` | Live Visit Journey card, 1-click stage advancement, biometric status | Doctors & Staff |

---

## 2. Tech Stack & Design System

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Lucide React icons.
- **Typography & Aesthetics**: `Outfit` and `DM Sans` font families, curated HSL color tokens, dark glassmorphism styling for `/reception`.
- **Avatar System**: Single-element animated video/canvas layer rendering Aria avatar with real-time state machine (`idle`, `speaking`, `listening`, `thinking`, `success`, `apologetic`).
- **Voice & Accessibility**: Web Speech API / TTS engine with fallback touch controls, captions on all avatar speech, 60s inactivity session reset.

---

## 3. Core Data Contracts (`IMaClient`)

```ts
export interface IMaClient {
  // Rooms & Stations
  getStations(orgId?: string): Promise<Station[]>;

  // Identity & Verification
  sendOtp(phone: string): Promise<{ success: boolean; expiresAt: string }>;
  verifyOtp(phone: string, otp: string): Promise<{ success: boolean; sessionToken: string }>;
  lookupClientsByPhone(phone: string, sessionToken?: string): Promise<PatientSummary[]>;
  createWalkInClient(data: CreatePatientPayload, sessionToken?: string): Promise<PatientSummary>;

  // Appointments & Check-in
  getTodayAppointments(clientId: string, sessionToken?: string): Promise<AppointmentSummary[]>;
  getServices(orgId?: string): Promise<ServiceItem[]>;
  getProviders(orgId?: string, serviceId?: string): Promise<ProviderItem[]>;
  getSlots(serviceId: string, date: string, providerId?: string): Promise<TimeSlot[]>;
  bookAppointment(data: BookAppointmentPayload, sessionToken?: string, idempotencyKey?: string): Promise<AppointmentSummary>;
  checkinAppointment(appointmentId: string, clientId: string, sessionToken?: string, idempotencyKey?: string): Promise<{ journey: Journey; ticket: QueueTicket }>;
  checkinWalkIn(payload: { patient: { name: string; phone: string; dob?: string }; reason?: string; processId?: string; idempotencyKey?: string }): Promise<{ success: boolean; ticket: QueueTicket; journey: Journey }>;

  // Queue & Stage Management
  getStationQueue(stationId: string): Promise<QueueTicket[]>;
  completeTicket(ticketId: string, nextStageIds?: string[], idempotencyKey?: string): Promise<{ journey: Journey; nextTickets: QueueTicket[] }>;
  skipTicket(ticketId: string, reason?: 'no_show' | 'left'): Promise<void>;

  // Biometric Face Check-in
  enrollFaceTemplate(clientId: string, vector: number[], consentGiven: boolean): Promise<boolean>;
  matchFace(template: number[], threshold?: number): Promise<{ matched: boolean; client?: PatientSummary; confidence: number }>;
  deleteFaceTemplate(clientId: string): Promise<boolean>;
  getFaceEnrollmentStatus(clientId: string): Promise<{ enrolled: boolean; enrolledAt?: string }>;

  // Settings & Process
  getDefaultOnboardingProcessId(): Promise<string>;
  setDefaultOnboardingProcessId(processId: string): Promise<void>;
}
```
