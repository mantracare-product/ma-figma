/**
 * reception.ts
 * Path: src/reception/types/reception.ts
 *
 * Core TypeScript definitions for Mantra AI Receptionist.
 * Fully decoupled from internal CRM stores and contexts.
 */

export type StageType = 'checkin' | 'consultation' | 'tests' | 'pharmacy' | 'billing' | 'custom';

export type StationType = 'doctor_room' | 'pharmacy' | 'lab' | 'billing' | 'desk' | 'custom';

export interface Station {
  id: string;
  orgId: string;
  name: string;
  type: StationType;
  providerId?: string;
  providerName?: string;
  roomNumber?: string;
  floorWing?: string;
  directions?: string;
  categoryId?: string;
  active: boolean;
  createdAt: string;
}

export interface DirectionCategory {
  id: string;
  name: string;           // e.g. "Clinical", "Facilities", "Pharmacy & Labs"
  icon?: string;          // lucide icon name
  rooms: DirectionRoom[];
}

export interface DirectionRoom {
  id: string;
  name: string;           // e.g. "Dr. Sharma's Room", "Restroom - Ground Floor"
  floorWing?: string;
  directions: string;     // directions text
  stationId?: string;
  categoryId?: string;
}

export const STATIC_DIRECTION_CATEGORIES: DirectionCategory[] = [
  {
    id: 'cat_pharmacy_labs',
    name: 'Pharmacy & Labs',
    icon: 'FlaskConical',
    rooms: [
      {
        id: 'station_pharmacy_1',
        name: 'Main Pharmacy & Dispensing',
        floorWing: 'Ground Floor, Main Lobby',
        directions: 'Located right next to the main entrance lobby, Counter A on your immediate left.',
        stationId: 'station_pharmacy_1',
        categoryId: 'cat_pharmacy_labs',
      },
      {
        id: 'station_lab_1',
        name: 'Diagnostic Lab & Blood Collection',
        floorWing: 'Ground Floor, Diagnostics Wing',
        directions: 'Turn right at the main corridor, follow the blue line to Diagnostic Lab 1.',
        stationId: 'station_lab_1',
        categoryId: 'cat_pharmacy_labs',
      },
    ],
  },
  {
    id: 'cat_clinical',
    name: 'Clinical & Doctors',
    icon: 'Stethoscope',
    rooms: [
      {
        id: 'st-consult-1',
        name: "Dr. Sharma's Consultation Room",
        floorWing: 'Ground Floor, Clinical Wing B',
        directions: 'Proceed down hallway B, past reception counter, 2nd door on right.',
        stationId: 'st-consult-1',
        categoryId: 'cat_clinical',
      },
      {
        id: 'st-consult-2',
        name: 'Dr. Rajesh Patel - Cardiology',
        floorWing: 'Ground Floor, Clinical Wing B',
        directions: 'Walk past reception, take hallway B on the right, room 102 is the 3rd door on the right.',
        stationId: 'st-consult-2',
        categoryId: 'cat_clinical',
      },
      {
        id: 'st-consult-3',
        name: 'Dr. Priya Nair - Pediatrics',
        floorWing: '1st Floor, Specialty Wing',
        directions: 'Take the central elevator to the 1st floor, turn left, Room 204 is on the left.',
        stationId: 'st-consult-3',
        categoryId: 'cat_clinical',
      },
    ],
  },
  {
    id: 'cat_facilities',
    name: 'Facilities & Restrooms',
    icon: 'Building2',
    rooms: [
      {
        id: 'st-restroom-1',
        name: 'Restroom - Ground Floor',
        floorWing: 'Ground Floor, Central Corridor',
        directions: 'Walk past reception desk, turn left at water station, restrooms are on the left.',
        stationId: 'st-restroom-1',
        categoryId: 'cat_facilities',
      },
      {
        id: 'st-restroom-2',
        name: 'Restroom - 1st Floor',
        floorWing: '1st Floor, Near Elevator',
        directions: 'Take the elevator to 1st floor, restrooms are immediately right of the elevator exit.',
        stationId: 'st-restroom-2',
        categoryId: 'cat_facilities',
      },
      {
        id: 'st-water',
        name: 'Drinking Water Station',
        floorWing: 'Ground Floor, Central Waiting Area',
        directions: 'Located right next to the central water fountain and seating lounge.',
        stationId: 'st-water',
        categoryId: 'cat_facilities',
      },
    ],
  },
];

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
    source?: 'ai_receptionist' | 'call' | 'web';
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
  createdVia?: 'ai_receptionist' | 'call' | 'web' | 'manual';
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
  createdVia?: 'ai_receptionist' | 'call' | 'web';
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
  source?: 'ai_receptionist' | 'call' | 'web';
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
  source?: 'ai_receptionist' | 'call' | 'web';
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
  | 'TICKET_COMPLETED' 
  | 'TICKET_SKIPPED' 
  | 'QUEUE_TICKET_CREATED';

export interface QueueEvent {
  type: QueueEventType;
  stationId?: string;
  ticket?: QueueTicket;
  timestamp?: string;
  payload?: any;
}

export interface ReceptionAuditEvent {
  id: string;
  orgId: string;
  userId?: string;
  clientId?: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
