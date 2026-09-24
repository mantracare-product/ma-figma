/**
 * mockMaClient.ts
 * Path: src/reception/lib/api/mockMaClient.ts
 *
 * Front-end mock implementation of IMaClient for AI Receptionist.
 * Operates over localStorage and in-memory state.
 * Operates exclusively on synthetic/demo data.
 */

import type { IMaClient } from './maClient';
import { initialClients as canonicalMaClients } from '../../../data/canonicalClients';
import { getStoredClients, saveStoredClients, addOrUpdateClient, CLIENTS_STORE_EVENT } from '../../../lib/clientsStore';
import { addProcessCallLog } from '../../../lib/processLogsStore';
import { getStoredServices } from '../../../lib/servicesStore';
import { getStoredTeamMembers } from '../../../lib/teamStore';
import type {
  Station,
  DirectionCategory,
  DirectionRoom,
  ReceptionConfig,
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
  PatientInvoiceSummary,
  ReceptionAuditEvent,
  VisitSummary,
} from '../../types/reception';

// Storage keys
const STORAGE_KEYS = {
  STATIONS: 'ma_reception_stations',
  CATEGORIES: 'ma_reception_direction_categories',
  CONFIG: 'ma_reception_config',
  QUEUES: 'ma_reception_queues',
  JOURNEYS: 'ma_reception_journeys',
  IDEMPOTENCY: 'ma_reception_idempotency',
  AUDIT: 'ma_reception_audit_logs',
  APPOINTMENTS: 'ma_reception_mock_appointments',
  FACE_TEMPLATES: 'ma_reception_face_templates',
};

const DEFAULT_ORG_ID = 'org_mantracare_default';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface MantraClientRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  processes?: string[];
  stage?: string;
  responsible?: string;
  lastContact?: string;
  status?: string;
  companyName?: string;
  jobPosition?: string;
  numberOfEmployees?: string;
  location?: string;
  age?: number;
  gender?: string;
  relation?: string;
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
  faceConsentAt?: string;
  faceTemplate?: number[];
  createdVia?: string;
  source?: string;
  processStages?: any[];
}

export const INITIAL_MA_CLIENTS: MantraClientRecord[] = canonicalMaClients.map((c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  phoneNumber: c.phone,
  country: c.country,
  countryCode: c.countryCode,
  countryFlag: c.countryFlag,
  processes: c.processes,
  stage: c.stage,
  responsible: c.responsible,
  lastContact: c.lastContact,
  status: c.status,
  companyName: c.companyName,
  jobPosition: c.jobPosition,
  numberOfEmployees: c.numberOfEmployees,
  location: c.location,
  age: c.name.toLowerCase().includes('abhishek') ? 29 : (c.name.match(/Priya|Sarah/i) ? 58 : 35),
  gender: c.name.match(/Priya|Sarah|Emily|Jessica|Lisa|Amanda|Jennifer|Sneha|Kavya|Deepika|Fatima|Layla|Charlotte|Emma|Sophia/i) ? 'Female' : 'Male',
  faceEnrolled: c.id === 'CL-013' || c.id === 'CL-001' || c.id === 'CL-014',
  faceEnrolledAt: (c.id === 'CL-013' || c.id === 'CL-001') ? '2026-09-02T11:15:00Z' : undefined,
}));

export class MockMaClient implements IMaClient {
  private static sharedMemoryStorage: Record<string, string> = {};
  private queueListeners: Set<(event: QueueEvent) => void> = new Set();

  static resetStorage(): void {
    MockMaClient.sharedMemoryStorage = {};
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('clients');
      window.localStorage?.removeItem('clients');
    }
  }

  constructor() {
    this.seedInitialDataIfEmpty();
  }

  // --- Helper Storage Operations ---

  private getStorage<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
      }
      const memData = MockMaClient.sharedMemoryStorage[key];
      return memData ? JSON.parse(memData) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      const serialized = JSON.stringify(val);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, serialized);
      }
      MockMaClient.sharedMemoryStorage[key] = serialized;
    } catch (err) {
      console.error(`Failed to write storage key [${key}]:`, err);
    }
  }

  // --- MantraAssist Real Client Database Operations ---

  public getMantraClients(): MantraClientRecord[] {
    const clients = getStoredClients();
    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      phoneNumber: c.phone,
      country: c.country,
      countryCode: c.countryCode,
      countryFlag: c.countryFlag,
      processes: c.processes,
      stage: c.stage,
      responsible: c.responsible || 'John Smith',
      lastContact: c.lastContact,
      status: c.status || 'Active',
      companyName: c.companyName,
      jobPosition: c.jobPosition,
      numberOfEmployees: c.numberOfEmployees,
      location: c.location,
      age: c.name.toLowerCase().includes('abhishek') ? 29 : 35,
      gender: c.name.match(/Priya|Sarah|Emily|Jessica|Lisa|Amanda|Jennifer|Sneha|Kavya|Deepika|Fatima|Layla|Charlotte|Emma|Sophia/i) ? 'Female' : 'Male',
      relation: 'Self',
      faceEnrolled: false,
      createdVia: 'ai_receptionist',
      source: 'ai_receptionist',
    }));
  }

  public saveMantraClients(clients: MantraClientRecord[]): void {
    saveStoredClients(clients as any);
  }

  public mantraClientToPatientSummary(c: MantraClientRecord): PatientSummary {
    const rawPhone = c.phone || c.phoneNumber || '';
    return {
      id: c.id,
      name: c.name || 'Patient',
      phone: rawPhone,
      email: c.email || undefined,
      age: c.age || (c.name.toLowerCase().includes('abhishek') ? 29 : 38),
      gender: (c.gender as any) || (c.name?.match(/Priya|Sarah|Emily|Jessica|Lisa|Amanda|Jennifer|Sneha|Kavya|Deepika|Fatima|Layla|Charlotte|Emma|Sophia/i) ? 'Female' : 'Male'),
      relation: c.relation || 'Self',
      faceEnrolled: !!c.faceEnrolled,
      faceEnrolledAt: c.faceEnrolledAt,
      faceConsentAt: c.faceConsentAt,
      faceTemplate: c.faceTemplate,
      createdVia: (c.createdVia as any) || 'ai_receptionist',
      defaultProcessId: c.processes?.[0] || 'Appointment Scheduling',
    };
  }

  private notifyQueueListeners(event: QueueEvent): void {
    this.queueListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.warn('Queue listener callback error:', err);
      }
    });
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      return `1${digits}`; // normalize 10-digit to include country code 1
    }
    return digits;
  }

  private seedInitialDataIfEmpty(): void {
    // 0. Direction Categories
    const existingCategories = this.getStorage<Array<{ id: string; name: string; icon?: string }> | null>(
      STORAGE_KEYS.CATEGORIES,
      null
    );
    if (!existingCategories || existingCategories.length === 0) {
      const initialCategories = [
        { id: 'cat_clinical', name: 'Clinical & Doctors', icon: 'Stethoscope' },
        { id: 'cat_pharmacy_labs', name: 'Pharmacy & Labs', icon: 'FlaskConical' },
        { id: 'cat_facilities', name: 'Facilities & Restrooms', icon: 'Building2' },
      ];
      this.setStorage(STORAGE_KEYS.CATEGORIES, initialCategories);
    }

    // 1. Rooms / Stations
    const existingStations = this.getStorage<Station[] | null>(STORAGE_KEYS.STATIONS, null);
    if (!existingStations || existingStations.length === 0 || !existingStations.some((s) => s.directions)) {
      const team = getStoredTeamMembers();
      const activeDoctors = team.filter((m) => m.status !== false && m.canBookAppointments !== false);
      const doctorStations: Station[] = (activeDoctors.length > 0 ? activeDoctors : team.slice(0, 3)).map((m, idx) => {
        const docDisplay = m.name.startsWith('Dr.') ? m.name : `Dr. ${m.name}`;
        return {
          id: `st-consult-${m.id}`,
          orgId: DEFAULT_ORG_ID,
          name: `${docDisplay}'s Consultation Room`,
          type: 'doctor_room' as const,
          providerId: String(m.id),
          providerName: docDisplay,
          roomNumber: `${101 + idx}`,
          floorWing: idx % 2 === 0 ? 'Ground Floor, Clinical Wing A' : '1st Floor, Specialty Wing',
          directions: `Proceed down the hallway, Room ${101 + idx} is on the right.`,
          categoryId: 'cat_clinical',
          active: true,
          createdAt: new Date().toISOString(),
        };
      });

      const initialStations: Station[] = [
        ...doctorStations,
        {
          id: 'station_pharmacy_1',
          orgId: DEFAULT_ORG_ID,
          name: 'Main Pharmacy & Dispensing',
          type: 'pharmacy',
          roomNumber: 'Counter A',
          floorWing: 'Ground Floor, Main Lobby',
          directions: 'Located right next to the main entrance lobby, Counter A on your immediate left.',
          categoryId: 'cat_pharmacy_labs',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'station_lab_1',
          orgId: DEFAULT_ORG_ID,
          name: 'Diagnostic Lab & Blood Collection',
          type: 'lab',
          roomNumber: 'Lab 1',
          floorWing: 'Ground Floor, Diagnostics Wing',
          directions: 'Turn right at the main corridor, follow the blue line to Diagnostic Lab 1.',
          categoryId: 'cat_pharmacy_labs',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-restroom-1',
          orgId: DEFAULT_ORG_ID,
          name: 'Restroom - Ground Floor',
          type: 'custom',
          roomNumber: 'G-Restroom',
          floorWing: 'Ground Floor, Central Corridor',
          directions: 'Walk past reception desk, turn left at water station, restrooms are on the left.',
          categoryId: 'cat_facilities',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-restroom-2',
          orgId: DEFAULT_ORG_ID,
          name: 'Restroom - 1st Floor',
          type: 'custom',
          roomNumber: '1F-Restroom',
          floorWing: '1st Floor, Near Elevator',
          directions: 'Take the elevator to 1st floor, restrooms are immediately right of the elevator exit.',
          categoryId: 'cat_facilities',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-water',
          orgId: DEFAULT_ORG_ID,
          name: 'Drinking Water & Refreshments',
          type: 'custom',
          roomNumber: 'Lounge Area',
          floorWing: 'Ground Floor, Main Waiting Lounge',
          directions: 'Water dispenser and coffee station are located at the back of the main waiting lounge.',
          categoryId: 'cat_facilities',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-billing',
          orgId: DEFAULT_ORG_ID,
          name: 'Billing & Insurance Desk',
          type: 'billing',
          roomNumber: 'Counters 3 & 4',
          floorWing: 'Ground Floor, Admin Section',
          directions: 'Proceed straight ahead from the main entrance, adjacent to the reception counter.',
          categoryId: 'cat_facilities',
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
      this.setStorage(STORAGE_KEYS.STATIONS, initialStations);
    }

    // 2. Config
    const existingConfig = this.getStorage<ReceptionConfig | null>(STORAGE_KEYS.CONFIG, null);
    if (!existingConfig) {
      const initialConfig: ReceptionConfig = {
        orgId: DEFAULT_ORG_ID,
        tokenPrefixes: {
          doctor: 'D-',
          pharmacy: 'P-',
          lab: 'L-',
          billing: 'B-',
          desk: 'R-',
        },
        lateArrivalWindowMin: 15,
        earlyArrivalBufferMin: 30,
        queueAgingCapMin: 45,
        defaultLanguages: ['en', 'hi', 'es'],
        defaultOnboardingProcessId: 'Appointment Scheduling',
      };
      this.setStorage(STORAGE_KEYS.CONFIG, initialConfig);
    }

    // 3. Mock Appointments & Face Biometrics
    const existingAppointments = this.getStorage<AppointmentSummary[] | null>(STORAGE_KEYS.APPOINTMENTS, null);
    if (!existingAppointments || existingAppointments.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const team = getStoredTeamMembers();
      const doc1 = team.find((m) => String(m.id) === '1') || team[0];
      const doc2 = team.find((m) => String(m.id) === '2') || team[1] || doc1;
      const doc3 = team.find((m) => String(m.id) === '5') || team[2] || doc2;

      const doc1Name = doc1 ? (doc1.name.startsWith('Dr.') ? doc1.name : `Dr. ${doc1.name}`) : 'Dr. John Smith';
      const doc2Name = doc2 ? (doc2.name.startsWith('Dr.') ? doc2.name : `Dr. ${doc2.name}`) : 'Dr. Sarah Johnson';
      const doc3Name = doc3 ? (doc3.name.startsWith('Dr.') ? doc3.name : `Dr. Robert Martinez`) : 'Dr. Robert Martinez';

      const demoAppointments: AppointmentSummary[] = [
        {
          id: 'apt-101',
          clientId: 'CL-001',
          clientName: 'Sarah Johnson',
          clientPhone: '+1 (555) 123-4567',
          serviceId: '1',
          serviceName: 'General Consultation',
          providerId: String(doc1?.id || '1'),
          providerName: doc1Name,
          date: todayStr,
          time: '10:30 AM',
          status: 'confirmed',
          receptionEnabled: true,
          source: 'ai_receptionist',
          roomStationId: `st-consult-${doc1?.id || '1'}`,
          roomName: `${doc1Name}'s Consultation Room`,
          tokenNumber: 'D-001',
        },
        {
          id: 'apt_2',
          clientId: 'CL-013',
          clientName: 'Priya Sharma',
          clientPhone: '+91 98201 72818',
          serviceId: '1',
          serviceName: 'Medical Consultation',
          providerId: String(doc2?.id || '2'),
          providerName: doc2Name,
          date: todayStr,
          time: '11:00 AM',
          status: 'confirmed',
          receptionEnabled: true,
          source: 'ai_receptionist',
          roomStationId: `st-consult-${doc2?.id || '2'}`,
          roomName: `${doc2Name}'s Consultation Room`,
          tokenNumber: 'D-002',
        },
        {
          id: 'apt_3',
          clientId: 'CL-015',
          clientName: 'Ananya Reddy',
          clientPhone: '+91 91234 56789',
          serviceId: '3',
          serviceName: 'Dental Cleaning',
          providerId: String(doc3?.id || '5'),
          providerName: doc3Name,
          date: todayStr,
          time: '02:00 PM',
          status: 'confirmed',
          receptionEnabled: true,
          source: 'ai_receptionist',
          roomStationId: `st-consult-${doc3?.id || '5'}`,
          roomName: `${doc3Name}'s Consultation Room`,
          tokenNumber: 'D-003',
        },
      ];
      this.setStorage(STORAGE_KEYS.APPOINTMENTS, demoAppointments);

      // Seed Face Templates (biometric embeddings prototype)
      const demoFaceTemplates: Record<string, { clientId: string; templateVector: number[]; consentGiven: boolean; enrolledAt: string }> = {
        'CL-013': {
          clientId: 'CL-013',
          templateVector: [0.38, 0.74, 0.22, 0.91, 0.55, 0.18, 0.63, 0.87],
          consentGiven: true,
          enrolledAt: '2026-09-02T11:15:00Z',
        },
        'CL-001': {
          clientId: 'CL-001',
          templateVector: [0.12, 0.44, 0.89, 0.23, 0.61, 0.77, 0.35, 0.49],
          consentGiven: true,
          enrolledAt: '2026-08-14T09:30:00Z',
        },
        'CL-014': {
          clientId: 'CL-014',
          templateVector: [0.72, 0.31, 0.45, 0.68, 0.84, 0.29, 0.51, 0.62],
          consentGiven: true,
          enrolledAt: '2026-09-10T14:20:00Z',
        },
        // Aliases for compatibility
        pat_3: {
          clientId: 'CL-013',
          templateVector: [0.38, 0.74, 0.22, 0.91, 0.55, 0.18, 0.63, 0.87],
          consentGiven: true,
          enrolledAt: '2026-09-02T11:15:00Z',
        },
        pat_1: {
          clientId: 'CL-001',
          templateVector: [0.12, 0.44, 0.89, 0.23, 0.61, 0.77, 0.35, 0.49],
          consentGiven: true,
          enrolledAt: '2026-08-14T09:30:00Z',
        },
      };
      this.setStorage(STORAGE_KEYS.FACE_TEMPLATES, demoFaceTemplates);
    }
  }

  // --- Idempotency Helper ---

  private async withIdempotency<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (!key) return operation();

    const idempotencyStore = this.getStorage<Record<string, { response: T; expiresAt: number }>>(
      STORAGE_KEYS.IDEMPOTENCY,
      {}
    );

    const cached = idempotencyStore[key];
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const result = await operation();
    idempotencyStore[key] = {
      response: result,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    };
    this.setStorage(STORAGE_KEYS.IDEMPOTENCY, idempotencyStore);
    return result;
  }

  async getStations(orgId: string = DEFAULT_ORG_ID): Promise<Station[]> {
    this.seedInitialDataIfEmpty();
    let stations = this.getStorage<Station[]>(STORAGE_KEYS.STATIONS, []);

    // Dynamically ensure all active team members from teamStore have a matching station
    try {
      const team = getStoredTeamMembers();
      const activeDoctors = team.filter((m) => m.status !== false && m.canBookAppointments !== false);
      let changed = false;

      for (const [idx, doc] of activeDoctors.entries()) {
        const stationId = `st-consult-${doc.id}`;
        const docDisplay = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
        const existingIdx = stations.findIndex((s) => s.id === stationId || s.providerId === String(doc.id));

        if (existingIdx !== -1) {
          // Update doctor name / room title if team member was updated
          if (stations[existingIdx].providerName !== docDisplay || stations[existingIdx].name !== `${docDisplay}'s Consultation Room`) {
            stations[existingIdx] = {
              ...stations[existingIdx],
              providerName: docDisplay,
              name: `${docDisplay}'s Consultation Room`,
            };
            changed = true;
          }
        } else {
          stations.unshift({
            id: stationId,
            orgId: DEFAULT_ORG_ID,
            name: `${docDisplay}'s Consultation Room`,
            type: 'doctor_room',
            providerId: String(doc.id),
            providerName: docDisplay,
            roomNumber: `${101 + idx}`,
            floorWing: idx % 2 === 0 ? 'Ground Floor, Clinical Wing A' : '1st Floor, Specialty Wing',
            directions: `Proceed down the hallway, Room ${101 + idx} is on the right.`,
            categoryId: 'cat_clinical',
            active: true,
            createdAt: new Date().toISOString(),
          });
          changed = true;
        }
      }

      if (changed) {
        this.setStorage(STORAGE_KEYS.STATIONS, stations);
      }
    } catch (e) {
      console.warn('Error syncing doctor stations with teamStore:', e);
    }

    return stations.filter((s) => !orgId || s.orgId === orgId);
  }

  async getDirectionCategories(orgId: string = DEFAULT_ORG_ID): Promise<DirectionCategory[]> {
    this.seedInitialDataIfEmpty();
    const stations = await this.getStations(orgId);
    const storedCategories = this.getStorage<Array<{ id: string; name: string; icon?: string }>>(
      STORAGE_KEYS.CATEGORIES,
      []
    );

    const categoriesMap = new Map<string, DirectionCategory>();

    // Register known categories
    for (const cat of storedCategories) {
      categoriesMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || 'MapPin',
        rooms: [],
      });
    }

    // Default "Other" category for unassigned/unknown categories
    const otherCategory: DirectionCategory = {
      id: 'cat_other',
      name: 'Other Locations',
      icon: 'MapPin',
      rooms: [],
    };

    // Group active stations with directions into their category
    for (const station of stations) {
      if (!station.active) continue;
      const room: DirectionRoom = {
        id: station.id,
        name: station.name,
        floorWing: station.floorWing || (station.roomNumber ? `Room ${station.roomNumber}` : undefined),
        directions: station.directions || `Located at room ${station.roomNumber || station.name}. Please ask reception for assistance.`,
        stationId: station.id,
        categoryId: station.categoryId,
      };

      if (station.categoryId && categoriesMap.has(station.categoryId)) {
        categoriesMap.get(station.categoryId)!.rooms.push(room);
      } else {
        otherCategory.rooms.push(room);
      }
    }

    const result: DirectionCategory[] = [];
    for (const cat of categoriesMap.values()) {
      if (cat.rooms.length > 0) {
        result.push(cat);
      }
    }
    if (otherCategory.rooms.length > 0) {
      result.push(otherCategory);
    }

    return result;
  }

  // --- OTP & Identity ---

  async sendOtp(phone: string): Promise<{ success: boolean; expiresAt: string }> {
    const digits = phone.replace(/\D/g, '');
    console.log(`[MockMaClient] Demo OTP sent to ${digits}: 1234`);
    return {
      success: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; sessionToken: string }> {
    // In mock demo, '1234' or '0000' is universally accepted OTP
    if (otp === '1234' || otp === '0000') {
      return {
        success: true,
        sessionToken: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      };
    }
    throw new Error('Invalid OTP. Please enter 1234 in demo mode.');
  }

  async lookupClientsByPhone(phone: string, _sessionToken?: string): Promise<PatientSummary[]> {
    this.seedInitialDataIfEmpty();
    const qDigits = phone.replace(/\D/g, '');
    if (!qDigits || qDigits.length < 3) return [];

    const maClients = this.getMantraClients();
    const matched = maClients.filter((c) => {
      const allPhones = [
        c.phone,
        c.phoneNumber,
        (c as any).mobile,
        (c as any).contact,
        (c as any).contactNumber,
        (c as any).clientPhone,
      ].filter(Boolean) as string[];

      for (const p of allPhones) {
        const cDigits = p.replace(/\D/g, '');
        if (!cDigits) continue;
        if (cDigits === qDigits) return true;
        if (qDigits.length >= 7 && cDigits.length >= 7) {
          if (cDigits.slice(-10) === qDigits.slice(-10)) return true;
          if (cDigits.endsWith(qDigits) || qDigits.endsWith(cDigits)) return true;
          if (cDigits.includes(qDigits) || qDigits.includes(cDigits)) return true;
        }
      }
      return false;
    });

    if (matched.length > 0) {
      return matched.map((c) => this.mantraClientToPatientSummary(c));
    }

    return [];
  }

  async lookupPatientByPhone(phone: string): Promise<{ found: boolean; patient?: PatientSummary }> {
    const matches = await this.lookupClientsByPhone(phone);
    if (matches.length > 0) {
      return { found: true, patient: matches[0] };
    }
    return { found: false };
  }

  async createWalkInClient(data: CreatePatientPayload, _sessionToken?: string): Promise<PatientSummary> {
    const clients = this.getMantraClients();
    const config = this.getStorage<ReceptionConfig>(STORAGE_KEYS.CONFIG, {
      orgId: DEFAULT_ORG_ID,
      tokenPrefixes: { doctor: 'D-', pharmacy: 'P-', lab: 'L-', billing: 'B-', desk: 'R-' },
      lateArrivalWindowMin: 15,
      earlyArrivalBufferMin: 30,
      queueAgingCapMin: 45,
      defaultLanguages: ['en', 'hi'],
      defaultOnboardingProcessId: 'Appointment Scheduling',
    });

    const defaultProcess =
      (typeof window !== 'undefined' ? localStorage.getItem('ma_appointment_default_process') : null) ||
      config.defaultOnboardingProcessId ||
      'Appointment Scheduling';
    const rawPhone = data.phone || '';
    const digits = rawPhone.replace(/\D/g, '');

    let country = 'IN';
    let countryCode = '+91';
    let countryFlag = '🇮🇳';
    let location = 'Mumbai, India';

    if (rawPhone.startsWith('+1') || (digits.length === 10 && digits.startsWith('555'))) {
      country = 'US';
      countryCode = '+1';
      countryFlag = '🇺🇸';
      location = 'New York, NY';
    } else if (rawPhone.startsWith('+44')) {
      country = 'GB';
      countryCode = '+44';
      countryFlag = '🇬🇧';
      location = 'London, UK';
    } else if (rawPhone.startsWith('+971')) {
      country = 'AE';
      countryCode = '+971';
      countryFlag = '🇦🇪';
      location = 'Dubai, UAE';
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // Dynamically resolve responsible doctor from teamStore
    let assignedDoctor = (data.responsible || (data as any).doctorName || '').replace(/^Dr\.\s*/i, '').trim();
    if (!assignedDoctor && (data as any).providerId && (data as any).providerId !== 'next_available') {
      const team = getStoredTeamMembers();
      const matched = team.find((m) => String(m.id) === String((data as any).providerId));
      if (matched) assignedDoctor = matched.name.replace(/^Dr\.\s*/i, '').trim();
    }
    if (!assignedDoctor) {
      const team = getStoredTeamMembers();
      const activeDoc = team.find((m) => m.status !== false && m.canBookAppointments !== false) || team[0];
      assignedDoctor = activeDoc ? activeDoc.name.replace(/^Dr\.\s*/i, '').trim() : 'John Smith';
    }

    const savedRecord = addOrUpdateClient({
      name: data.name.trim(),
      email: data.email?.trim(),
      phone: data.phone,
      country,
      countryCode,
      countryFlag,
      processes: [defaultProcess],
      stage: 'Initial Contact',
      responsible: assignedDoctor,
      lastContact: todayStr,
      status: 'Active',
      location,
    });

    const newClientRecord: MantraClientRecord = {
      ...savedRecord,
      phoneNumber: savedRecord.phone,
      age: data.age || 35,
      gender: data.gender || 'Female',
      relation: data.relation || 'Self',
      faceEnrolled: !!data.faceEnrolled,
      faceEnrolledAt: data.faceEnrolled ? nowIso : undefined,
      faceConsentAt: data.consentAt || (data.faceEnrolled ? nowIso : undefined),
      faceTemplate: data.faceTemplate,
      createdVia: 'ai_receptionist',
      source: 'ai_receptionist',
    };

    // Sync deal into Deals / Process pipeline in sessionStorage & localStorage
    this.syncDealRecord(newClientRecord.name, assignedDoctor, defaultProcess, 'Initial Contact', 'Consultation', 150);
    addProcessCallLog({
      clientId: newClientRecord.id,
      clientName: newClientRecord.name,
      processName: defaultProcess,
      stageName: 'Initial Contact',
    });

    const patientSummary = this.mantraClientToPatientSummary(newClientRecord);

    // If face template vector provided, save biometric template
    if (data.faceEnrolled && data.faceTemplate && data.consentGiven) {
      await this.saveFaceTemplate(newClientRecord.id, data.faceTemplate, data.consentAt || nowIso, 'ai_receptionist');
    } else {
      await this.logAuditEvent({
        id: `aud_${Date.now()}_face_skip`,
        orgId: DEFAULT_ORG_ID,
        clientId: newClientRecord.id,
        action: 'receptionist_face_skipped',
        metadata: { reason: 'patient_skipped_or_declined' },
        timestamp: nowIso,
      });
    }

    // Log Activity Events to MA audit feed
    await this.logAuditEvent({
      id: `aud_${Date.now()}`,
      orgId: DEFAULT_ORG_ID,
      clientId: newClientRecord.id,
      action: 'receptionist_onboarding_completed',
      metadata: { name: newClientRecord.name, phone: newClientRecord.phone, createdVia: 'ai_receptionist' },
      timestamp: nowIso,
    });

    await this.logAuditEvent({
      id: `aud_${Date.now()}_proc`,
      orgId: DEFAULT_ORG_ID,
      clientId: newClientRecord.id,
      action: 'process_assigned',
      metadata: { processName: defaultProcess, assignedVia: 'receptionist_default_rule' },
      timestamp: nowIso,
    });

    return patientSummary;
  }

  // --- Booking & Appointments (Linked to MantraAssist Appointments Store) ---

  async getTodayAppointments(clientId: string, _sessionToken?: string): Promise<AppointmentSummary[]> {
    this.seedInitialDataIfEmpty();
    const storedAppointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const result = storedAppointments.filter((a) => a.clientId === clientId || (clientId === 'pat_3' && a.clientId === 'CL-013') || (clientId === 'pat_1' && a.clientId === 'CL-001'));

    // Also fetch from MantraAssist appointments_v1 session/local store
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage?.getItem('appointments_v1') || window.sessionStorage?.getItem('appointments_v1');
        if (raw) {
          const maApts = JSON.parse(raw);
          const clients = this.getMantraClients();
          const client = clients.find((c) => c.id === clientId || (clientId === 'pat_3' && c.id === 'CL-013') || (clientId === 'pat_1' && c.id === 'CL-001'));
          const clientPhoneDigits = (client?.phone || client?.phoneNumber || '').replace(/\D/g, '');
          const clientNameLower = (client?.name || '').toLowerCase();
          const todayStr = new Date().toISOString().split('T')[0];

          if (Array.isArray(maApts)) {
            for (const maApt of maApts) {
              const aptPhoneDigits = (maApt.clientPhone || '').replace(/\D/g, '');
              const aptNameLower = (maApt.clientName || '').toLowerCase();
              const isMatch =
                (maApt.clientId && (maApt.clientId === clientId || (clientId === 'CL-013' && maApt.clientId === 'pat_3'))) ||
                (clientPhoneDigits && aptPhoneDigits && (clientPhoneDigits === aptPhoneDigits || (clientPhoneDigits.length >= 7 && (clientPhoneDigits.slice(-10) === aptPhoneDigits.slice(-10) || clientPhoneDigits.endsWith(aptPhoneDigits) || aptPhoneDigits.endsWith(clientPhoneDigits))))) ||
                (clientNameLower && aptNameLower && clientNameLower === aptNameLower);

              if (isMatch) {
                const alreadyIncluded = result.some((r) => r.id === String(maApt.id) || r.tokenNumber === maApt.tokenNumber);
                if (!alreadyIncluded) {
                  const team = getStoredTeamMembers();
                  const services = getStoredServices();
                  const matchedProv = team.find((m) => String(m.id) === String(maApt.employeeId));
                  const matchedSrv = services.find((s) => String(s.id) === String(maApt.serviceId));

                  const doctorRaw = matchedProv?.name || 'Sarah Johnson';
                  const doctorDisplay = doctorRaw.startsWith('Dr.') ? doctorRaw : `Dr. ${doctorRaw}`;
                  const dynamicRoom = maApt.roomName || `${doctorDisplay}'s Consultation Room`;

                  result.push({
                    id: String(maApt.id),
                    clientId: clientId,
                    clientName: maApt.clientName || client?.name || 'Patient',
                    clientPhone: maApt.clientPhone || client?.phone || '',
                    serviceId: String(matchedSrv?.id || maApt.serviceId || '1'),
                    serviceName: maApt.serviceName || matchedSrv?.name || 'General Consultation',
                    providerId: String(matchedProv?.id || maApt.employeeId || '1'),
                    providerName: maApt.providerName || doctorDisplay,
                    date: maApt.date || todayStr,
                    time: maApt.time?.includes(':') ? (maApt.time.includes('AM') || maApt.time.includes('PM') ? maApt.time : `${maApt.time} AM`) : '11:00 AM',
                    status: (maApt.status as any) || 'confirmed',
                    receptionEnabled: true,
                    source: (maApt.source as any) || 'ai_receptionist',
                    roomStationId: 'st-consult-1',
                    roomName: dynamicRoom,
                    tokenNumber: maApt.tokenNumber || 'D-001',
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error reading appointments_v1 store in mockMaClient:', err);
      }
    }

    return result;
  }

  async getServices(orgId: string = DEFAULT_ORG_ID): Promise<ServiceItem[]> {
    try {
      const stored = getStoredServices();
      if (Array.isArray(stored) && stored.length > 0) {
        return stored
          .filter((s) => s.isActive !== false)
          .map((s) => ({
            id: String(s.id),
            orgId,
            name: s.name,
            category: s.category || 'Consultation',
            durationMin: s.duration || 30,
            basePrice: s.price || 0,
            cptCode: s.cptCode,
            receptionEnabled: s.isActive !== false,
          }));
      }
    } catch (e) {
      console.warn('Error fetching live services from servicesStore:', e);
    }
    return [
      { id: '1', orgId, name: 'Initial Consultation', category: 'Consultation', durationMin: 60, basePrice: 150, receptionEnabled: true },
      { id: '2', orgId, name: 'Follow-up Visit', category: 'Consultation', durationMin: 30, basePrice: 75, receptionEnabled: true },
      { id: '3', orgId, name: 'Dental Cleaning', category: 'Dental', durationMin: 45, basePrice: 120, receptionEnabled: true },
    ];
  }

  async getProviders(orgId: string = DEFAULT_ORG_ID, serviceId?: string): Promise<ProviderItem[]> {
    try {
      const team = getStoredTeamMembers();
      const services = getStoredServices();
      const selectedService = serviceId ? services.find((s) => String(s.id) === String(serviceId)) : null;

      const bookable = team.filter((m) => m.status !== false && m.canBookAppointments !== false);
      let eligible = bookable;

      if (selectedService && selectedService.assignedEmployees && selectedService.assignedEmployees.length > 0) {
        eligible = bookable.filter((m) =>
          selectedService.assignedEmployees?.some((empId) => String(empId) === String(m.id))
        );
        if (eligible.length === 0) eligible = bookable;
      }

      if (eligible.length > 0) {
        return eligible.map((m) => ({
          id: String(m.id),
          orgId,
          name: m.name.startsWith('Dr.') ? m.name : `Dr. ${m.name}`,
          specialty: m.role || m.department || 'Consultant',
          specialization: m.department || 'General Practice',
          assignedStationId: 'st-consult-1',
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        }));
      }
    } catch (e) {
      console.warn('Error fetching live team members for reception:', e);
    }

    return [
      { id: '1', orgId, name: 'Dr. John Smith', specialty: 'General Physician', specialization: 'Internal Medicine', assignedStationId: 'st-consult-1', availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      { id: '2', orgId, name: 'Dr. Sarah Johnson', specialty: 'Medical Consultant', specialization: 'Family Medicine', assignedStationId: 'st-consult-1', availableDays: ['Mon', 'Wed', 'Fri'] },
      { id: '5', orgId, name: 'Dr. Robert Martinez', specialty: 'Dentist', specialization: 'Dental Surgery', assignedStationId: 'st-consult-1', availableDays: ['Tue', 'Thu', 'Sat'] },
    ];
  }

  async getSlots(_serviceId: string, date: string, providerId?: string): Promise<TimeSlot[]> {
    const defaultSlots: Array<{ id: string; time: string; startTime: string; endTime: string }> = [
      { id: 'slot_1', time: '09:00 AM', startTime: '09:00 AM', endTime: '09:30 AM' },
      { id: 'slot_2', time: '09:30 AM', startTime: '09:30 AM', endTime: '10:00 AM' },
      { id: 'slot_3', time: '10:00 AM', startTime: '10:00 AM', endTime: '10:30 AM' },
      { id: 'slot_4', time: '10:30 AM', startTime: '10:30 AM', endTime: '11:00 AM' },
      { id: 'slot_5', time: '11:00 AM', startTime: '11:00 AM', endTime: '11:30 AM' },
      { id: 'slot_6', time: '11:30 AM', startTime: '11:30 AM', endTime: '12:00 PM' },
      { id: 'slot_7', time: '02:00 PM', startTime: '02:00 PM', endTime: '02:30 PM' },
      { id: 'slot_8', time: '02:30 PM', startTime: '02:30 PM', endTime: '03:00 PM' },
      { id: 'slot_9', time: '03:00 PM', startTime: '03:00 PM', endTime: '03:30 PM' },
      { id: 'slot_10', time: '04:00 PM', startTime: '04:00 PM', endTime: '04:30 PM' },
      { id: 'slot_11', time: '04:30 PM', startTime: '04:30 PM', endTime: '05:00 PM' },
    ];

    // Check booked appointments in sessionStorage appointments_v1 and mockMaClient
    const bookedTimes: string[] = [];
    try {
      if (typeof window !== 'undefined') {
        const rawApts = window.localStorage?.getItem('appointments_v1') || window.sessionStorage?.getItem('appointments_v1');
        const maApts = rawApts ? JSON.parse(rawApts) : [];
        for (const apt of maApts) {
          if (apt.date === date && (!providerId || String(apt.employeeId) === String(providerId))) {
            const t = String(apt.time || '').toLowerCase().replace(/\s+/g, '');
            bookedTimes.push(t);
          }
        }
      }
      const receptionApts = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
      for (const apt of receptionApts) {
        if (apt.date === date && (!providerId || String(apt.providerId) === String(providerId))) {
          const t = String(apt.time || '').toLowerCase().replace(/\s+/g, '');
          bookedTimes.push(t);
        }
      }
    } catch (e) {
      console.warn('Error reading booked appointments for slots:', e);
    }

    return defaultSlots.map((slot) => {
      const norm = slot.time.toLowerCase().replace(/\s+/g, '');
      const isBooked = bookedTimes.some((bt) => bt.includes(norm) || norm.includes(bt));
      return {
        ...slot,
        available: !isBooked,
      };
    });
  }

  private syncDealRecord(
    clientName: string,
    doctorName: string,
    processName: string,
    stageName: string,
    serviceName: string = 'Consultation',
    amount: number = 150
  ) {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem('deals') || sessionStorage.getItem('deals');
      const deals: any[] = raw ? JSON.parse(raw) : [];
      const cleanDoctor = doctorName.replace(/^Dr\.\s*/i, '');
      const fullStage = `${processName}: ${stageName}`;
      const existingIdx = deals.findIndex((d) => d.clientName?.toLowerCase() === clientName.toLowerCase());
      const todayStr = new Date().toISOString().split('T')[0];

      if (existingIdx !== -1) {
        deals[existingIdx] = {
          ...deals[existingIdx],
          dealName: `${serviceName} — ${clientName}`,
          responsible: cleanDoctor,
          stage: fullStage,
          status: 'In Progress',
        };
      } else {
        const dealId = `DEAL-${String(deals.length + 1).padStart(3, '0')}`;
        deals.unshift({
          id: dealId,
          dealName: `${serviceName} — ${clientName}`,
          clientName: clientName,
          amount,
          currency: '₹',
          createdDate: todayStr,
          status: 'In Progress',
          responsible: cleanDoctor,
          stage: fullStage,
        });
      }
      sessionStorage.setItem('deals', JSON.stringify(deals));
      localStorage.setItem('deals', JSON.stringify(deals));
      window.dispatchEvent(new Event('deals_updated'));
      try {
        const bc = new BroadcastChannel('deals_broadcast_channel');
        bc.postMessage({ type: 'DEALS_UPDATED' });
        bc.close();
      } catch {}
    } catch (e) {
      console.warn('Error syncing deal record in mockMaClient:', e);
    }
  }

  async bookAppointment(
    data: BookAppointmentPayload,
    _sessionToken: string = '',
    idempotencyKey: string = ''
  ): Promise<AppointmentSummary> {
    return this.withIdempotency(idempotencyKey, async () => {
      this.seedInitialDataIfEmpty();
      const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
      const mantraClients = this.getMantraClients();
      const clientRecord = mantraClients.find((c) => c.id === data.clientId);

      const clientName = data.clientName || clientRecord?.name || 'Patient';
      const clientPhone = data.clientPhone || clientRecord?.phone || clientRecord?.phoneNumber || '';
      const clientEmail = data.clientEmail || clientRecord?.email || '';

      const services = await this.getServices();
      const srv = (data.serviceId ? services.find((s) => String(s.id) === String(data.serviceId)) : null) || services[0];

      const providers = await this.getProviders();
      const prov = (data.providerId ? providers.find((p) => String(p.id) === String(data.providerId)) : null) || providers[0];

      const cleanDoctorRaw = (prov?.name || 'Sarah Johnson').replace(/^Dr\.\s*/i, '');
      const doctorDisplayName = prov?.name ? (prov.name.startsWith('Dr.') ? prov.name : `Dr. ${cleanDoctorRaw}`) : `Dr. ${cleanDoctorRaw}`;
      const dynamicRoomName = `${doctorDisplayName}'s Consultation Room`;

      const defaultProcess =
        (typeof window !== 'undefined' ? localStorage.getItem('ma_appointment_default_process') : null) ||
        'Appointment Scheduling';

      // Update Client's responsible doctor & processes in MantraAssist
      addOrUpdateClient({
        id: data.clientId,
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        responsible: cleanDoctorRaw,
        processes: [defaultProcess],
        stage: 'Confirmed',
      });

      // Sync Deal in Process Pipeline
      this.syncDealRecord(clientName, cleanDoctorRaw, defaultProcess, 'Confirmed', srv?.name || 'Consultation', srv?.basePrice || 150);
      addProcessCallLog({
        clientId: data.clientId,
        clientName,
        processName: defaultProcess,
        stageName: 'Confirmed',
      });

      // Resolve valid time
      let validTime = data.time;
      if (!validTime || validTime.includes('Now') || validTime.includes('Invalid')) {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        validTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }

      const tokenNumber = `D-${String(appointments.length + 1).padStart(3, '0')}`;

      const newApt: AppointmentSummary = {
        id: `apt_${Date.now()}`,
        clientId: data.clientId,
        clientName,
        clientPhone,
        serviceId: String(srv?.id || data.serviceId || '1'),
        serviceName: srv?.name || 'General Consultation',
        providerId: String(prov?.id || '1'),
        providerName: doctorDisplayName,
        date: data.date,
        time: validTime,
        status: 'confirmed',
        receptionEnabled: true,
        source: data.source || 'ai_receptionist',
        roomStationId: 'st-consult-1',
        roomName: dynamicRoomName,
        tokenNumber,
      };

      appointments.push(newApt);
      this.setStorage(STORAGE_KEYS.APPOINTMENTS, appointments);

      // Sync with localStorage & sessionStorage appointments_v1 for MA Appointments page
      try {
        if (typeof window !== 'undefined') {
          const rawApts = window.localStorage?.getItem('appointments_v1') || window.sessionStorage?.getItem('appointments_v1');
          const maApts = rawApts ? JSON.parse(rawApts) : [];
          const numericId = Date.now();
          maApts.unshift({
            id: numericId,
            clientName,
            clientEmail,
            clientPhone,
            employeeId: Number(prov?.id) || 1,
            serviceId: Number(srv?.id) || 1,
            date: data.date,
            time: validTime.replace(/ AM| PM/i, ''),
            duration: srv?.durationMin || 30,
            status: 'scheduled',
            notes: data.reason || 'Booked via AI Receptionist',
            source: 'ai_receptionist',
            roomName: dynamicRoomName,
            tokenNumber,
            processId: defaultProcess,
            stageId: 'Confirmed',
          });
          window.localStorage?.setItem('appointments_v1', JSON.stringify(maApts));
          window.sessionStorage?.setItem('appointments_v1', JSON.stringify(maApts));
          window.dispatchEvent(new CustomEvent('mantra_appointments_updated'));
          try {
            const bc = new BroadcastChannel('mantra_appointments_broadcast_channel');
            bc.postMessage({ type: 'APPOINTMENTS_UPDATED' });
            bc.close();
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to sync appointment with MA sessionStore:', e);
      }

      return newApt;
    });
  }

  // --- Journey & Check-In Operations ---

  async getDefaultJourneyTemplate(_serviceId: string, _orgId: string = DEFAULT_ORG_ID): Promise<ProcessStageDef[]> {
    return [
      { stageId: 'stg_def_1', name: 'Check-in & Vitals', stationType: 'desk', order: 1, autoAdvance: true, isOptional: false },
      { stageId: 'stg_def_2', name: 'Doctor Consultation', stationType: 'doctor_room', order: 2, autoAdvance: false, isOptional: false },
      { stageId: 'stg_def_3', name: 'Pharmacy / Prescription', stationType: 'pharmacy', order: 3, autoAdvance: true, isOptional: true },
      { stageId: 'stg_def_4', name: 'Billing & Checkout', stationType: 'billing', order: 4, autoAdvance: true, isOptional: false },
    ];
  }

  async getJourney(journeyId: string): Promise<Journey> {
    const journeys = this.getStorage<Record<string, Journey>>(STORAGE_KEYS.JOURNEYS, {});
    const journey = journeys[journeyId];
    if (!journey) throw new Error(`Journey ${journeyId} not found`);
    return journey;
  }

  async checkinAppointment(
    appointmentId: string,
    clientId: string,
    _sessionToken: string = '',
    idempotencyKey: string = ''
  ): Promise<{ journey: Journey; ticket: QueueTicket }> {
    return this.withIdempotency(idempotencyKey, async () => {
      this.seedInitialDataIfEmpty();
      const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
      const aptIdx = appointments.findIndex((a) => a.id === appointmentId);
      const apt = aptIdx !== -1 ? appointments[aptIdx] : null;

      const mantraClients = this.getMantraClients();
      const clientRecord = mantraClients.find((c) => c.id === clientId);
      const patient: PatientSummary = clientRecord
        ? this.mantraClientToPatientSummary(clientRecord)
        : {
            id: clientId,
            name: apt?.clientName || 'Patient',
            phone: apt?.clientPhone || '',
            relation: 'Self' as const,
          };

      let provRawName = apt?.providerName ? apt.providerName.replace(/^Dr\.\s*/i, '') : '';
      if (!provRawName && apt?.providerId) {
        const team = getStoredTeamMembers();
        const matched = team.find((m) => String(m.id) === String(apt.providerId));
        if (matched) provRawName = matched.name.replace(/^Dr\.\s*/i, '');
      }
      if (!provRawName) {
        const team = getStoredTeamMembers();
        const activeDoc = team.find((m) => m.status !== false && m.canBookAppointments !== false) || team[0];
        provRawName = activeDoc ? activeDoc.name.replace(/^Dr\.\s*/i, '') : 'John Smith';
      }

      const doctorDisplayName = provRawName.startsWith('Dr.') ? provRawName : `Dr. ${provRawName}`;
      const dynamicRoomName = apt?.roomName || `${doctorDisplayName}'s Consultation Room`;

      const stations = await this.getStations(DEFAULT_ORG_ID);
      const targetStation =
        stations.find((s) => apt?.roomStationId && s.id === apt.roomStationId) ||
        stations.find((s) => apt?.providerId && (s.providerId === String(apt.providerId) || s.id === `st-consult-${apt.providerId}`)) ||
        stations.find((s) => s.type === 'doctor_room') ||
        stations.find((s) => s.type === 'desk') ||
        stations[0];

      if (targetStation) {
        targetStation.name = dynamicRoomName;
      }

      const config = this.getStorage<ReceptionConfig>(STORAGE_KEYS.CONFIG, {
        orgId: DEFAULT_ORG_ID,
        tokenPrefixes: { doctor: 'D-', pharmacy: 'P-', lab: 'L-', billing: 'B-', desk: 'R-' },
        lateArrivalWindowMin: 15,
        earlyArrivalBufferMin: 30,
        queueAgingCapMin: 45,
        defaultLanguages: ['en', 'hi'],
      });

      const prefixKey = (targetStation.type === 'doctor_room' ? 'doctor' : targetStation.type) as keyof typeof config.tokenPrefixes;
      const prefix = (config.tokenPrefixes && config.tokenPrefixes[prefixKey]) || 'D-';
      const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
      const stationTickets = queues[targetStation.id] || [];
      const tokenNum = String(stationTickets.length + 1).padStart(3, '0');
      const tokenLabel = apt?.tokenNumber || `${prefix}${tokenNum}`;

      const journeyId = `jrn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const stages = await this.getDefaultJourneyTemplate(apt?.serviceId || 'srv_consult', DEFAULT_ORG_ID);

      const journey: Journey = {
        id: journeyId,
        orgId: DEFAULT_ORG_ID,
        clientId: patient.id,
        clientName: patient.name,
        clientPhone: patient.phone,
        appointmentId: apt?.id,
        processId: 'Appointment Scheduling',
        processName: 'Clinical Consultation Flow',
        source: 'scheduled',
        status: 'active',
        currentStatus: 'checked_in',
        currentStageId: stages[0].stageId || 'stg_def_1',
        activeStageIds: [stages[0].stageId || 'stg_def_1'],
        stages: stages.map((s, idx) => ({
          stageId: s.stageId,
          name: s.name,
          stationId: s.stationType === targetStation.type ? targetStation.id : undefined,
          type: s.type,
          status: idx === 0 ? 'waiting' : 'pending',
          enteredAt: idx === 0 ? new Date().toISOString() : undefined,
        })),
        startedAt: new Date().toISOString(),
      };

      const ticket: QueueTicket = {
        id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orgId: DEFAULT_ORG_ID,
        stationId: targetStation.id,
        stationName: dynamicRoomName,
        journeyId,
        journeyStageId: stages[0].stageId,
        clientId: patient.id,
        clientName: patient.name,
        clientPhone: patient.phone,
        tokenLabel,
        priority: 1,
        status: 'waiting',
        scheduledTime: apt?.time,
        estimatedWaitMin: Math.max(5, (stationTickets.filter((t) => t.status === 'waiting').length + 1) * 10),
        createdAt: new Date().toISOString(),
      };

      stationTickets.push(ticket);
      queues[targetStation.id] = stationTickets;
      this.setStorage(STORAGE_KEYS.QUEUES, queues);

      const journeys = this.getStorage<Record<string, Journey>>(STORAGE_KEYS.JOURNEYS, {});
      journeys[journeyId] = journey;
      this.setStorage(STORAGE_KEYS.JOURNEYS, journeys);

      if (apt) {
        apt.checkedInAt = new Date().toISOString();
        apt.journeyId = journeyId;
        appointments[aptIdx] = apt;
        this.setStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
      }

      this.notifyQueueListeners({
        type: 'TICKET_CREATED',
        stationId: targetStation.id,
        ticket,
        timestamp: new Date().toISOString(),
      });

      await this.logAuditEvent({
        id: `aud_${Date.now()}`,
        orgId: DEFAULT_ORG_ID,
        clientId: patient.id,
        action: 'receptionist_checkin',
        metadata: { tokenLabel, stationId: targetStation.id },
        timestamp: new Date().toISOString(),
      });

      return { journey, ticket };
    });
  }

  async checkinByQrCode(
    qrPayload: string,
    sessionToken: string = '',
    idempotencyKey: string = ''
  ): Promise<{ journey: Journey; ticket: QueueTicket; appointment: AppointmentSummary; success: boolean }> {
    this.seedInitialDataIfEmpty();
    const aptId = qrPayload.trim();
    const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const apt = appointments.find((a) => a.id === aptId);
    if (!apt) throw new Error('Invalid or unrecognized appointment QR pass.');
    const res = await this.checkinAppointment(apt.id, apt.clientId, sessionToken, idempotencyKey);
    return { ...res, appointment: apt, success: true };
  }

  async checkinWalkIn(payload: {
    patient: { name: string; phone: string; dob?: string };
    reason?: string;
    processId?: string;
    providerId?: string;
    serviceId?: string;
    responsible?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; ticket: QueueTicket; journey: Journey }> {
    const idempotencyKey = payload.idempotencyKey || '';
    return this.withIdempotency(idempotencyKey, async () => {
      let patient = (await this.lookupClientsByPhone(payload.patient.phone))[0];
      if (!patient) {
        patient = await this.createWalkInClient({
          name: payload.patient.name,
          phone: payload.patient.phone,
          relation: 'Self',
          providerId: payload.providerId,
          responsible: payload.responsible,
        });
      }

      // Resolve team member and service
      const team = getStoredTeamMembers();
      const services = getStoredServices();
      let chosenDoc = team.find((m) => String(m.id) === String(payload.providerId));
      if (!chosenDoc) {
        chosenDoc = team.find((m) => m.status !== false && m.canBookAppointments !== false) || team[0];
      }
      const chosenService = services.find((s) => String(s.id) === String(payload.serviceId)) || services[0];
      const doctorDisplayName = chosenDoc ? (chosenDoc.name.startsWith('Dr.') ? chosenDoc.name : `Dr. ${chosenDoc.name}`) : 'Doctor Consultation';

      // 1. Sync / create a walk-in appointment record into Appointments store (appointments_v1)
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const validTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
      const todayStr = now.toISOString().split('T')[0];

      const defaultProcess =
        payload.processId ||
        (typeof window !== 'undefined' ? localStorage.getItem('ma_appointment_default_process') : null) ||
        'Appointment Scheduling';

      const existingReceptionApts = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
      const tokenNumber = `D-${String(existingReceptionApts.length + 1).padStart(3, '0')}`;
      const dynamicRoomName = `${doctorDisplayName}'s Consultation Room`;

      const newApt: AppointmentSummary = {
        id: `apt_walkin_${Date.now()}`,
        clientId: patient.id,
        clientName: patient.name,
        clientPhone: patient.phone,
        serviceId: String(chosenService?.id || '1'),
        serviceName: chosenService?.name || 'Walk-in Consultation',
        providerId: String(chosenDoc?.id || '1'),
        providerName: doctorDisplayName,
        date: todayStr,
        time: validTime,
        status: 'confirmed',
        receptionEnabled: true,
        source: 'ai_receptionist',
        roomStationId: `st-consult-${chosenDoc?.id || 1}`,
        roomName: dynamicRoomName,
        tokenNumber,
      };

      existingReceptionApts.push(newApt);
      this.setStorage(STORAGE_KEYS.APPOINTMENTS, existingReceptionApts);

      // Sync Deal & Process Log
      this.syncDealRecord(
        patient.name,
        doctorDisplayName.replace(/^Dr\.\s*/i, ''),
        defaultProcess,
        'Initial Contact',
        chosenService?.name || 'Walk-in Consultation',
        (chosenService as any)?.basePrice || 150
      );
      addProcessCallLog({
        clientId: patient.id,
        clientName: patient.name,
        processName: defaultProcess,
        stageName: 'Initial Contact',
      });

      // Sync to Appointments.tsx storage & dispatch event
      try {
        if (typeof window !== 'undefined') {
          const rawApts = window.localStorage?.getItem('appointments_v1') || window.sessionStorage?.getItem('appointments_v1');
          const maApts = rawApts ? JSON.parse(rawApts) : [];
          const numericId = Date.now();
          maApts.unshift({
            id: numericId,
            clientName: patient.name,
            clientEmail: (patient as any).email || '',
            clientPhone: patient.phone,
            employeeId: Number(chosenDoc?.id) || 1,
            serviceId: Number(chosenService?.id) || 1,
            date: todayStr,
            time: validTime.replace(/ AM| PM/i, ''),
            duration: chosenService?.duration || 30,
            status: 'arrived',
            notes: payload.reason || 'Walk-in Registration via AI Receptionist',
            source: 'ai_receptionist',
            roomName: dynamicRoomName,
            tokenNumber,
            processId: defaultProcess,
            stageId: 'Initial Contact',
          });
          window.localStorage?.setItem('appointments_v1', JSON.stringify(maApts));
          window.sessionStorage?.setItem('appointments_v1', JSON.stringify(maApts));
          window.dispatchEvent(new CustomEvent('mantra_appointments_updated'));
          try {
            const bc = new BroadcastChannel('mantra_appointments_broadcast_channel');
            bc.postMessage({ type: 'APPOINTMENTS_UPDATED' });
            bc.close();
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to sync walk-in appointment with MA sessionStore:', e);
      }

      // 2. Perform kiosk checkin & create ticket
      const checkinRes = await this.checkinAppointment(newApt.id, patient.id, '', '');
      return {
        success: true,
        ticket: {
          ...checkinRes.ticket,
          ticketNumber: checkinRes.ticket.tokenLabel,
          patientName: patient.name,
          patientId: patient.id,
        },
        journey: {
          ...checkinRes.journey,
          currentStatus: 'in_progress',
        },
      };
    });
  }

  // --- Queue Operations ---

  async getStationQueue(stationId: string): Promise<QueueTicket[]> {
    const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
    return queues[stationId] || [];
  }

  async getQueueTickets(): Promise<QueueTicket[]> {
    const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
    return Object.values(queues).flat();
  }

  async completeTicket(
    ticketId: string,
    nextStageIds: string[] = [],
    idempotencyKey: string = ''
  ): Promise<{ journey: Journey; nextTickets: QueueTicket[] }> {
    return this.withIdempotency(idempotencyKey, async () => {
      const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
      let completedTicket: QueueTicket | null = null;
      let sourceStationId = '';

      for (const stationId of Object.keys(queues)) {
        const idx = queues[stationId].findIndex((t) => t.id === ticketId);
        if (idx !== -1) {
          completedTicket = queues[stationId][idx];
          completedTicket.status = 'completed';
          completedTicket.completedAt = new Date().toISOString();
          sourceStationId = stationId;
          break;
        }
      }

      if (!completedTicket) throw new Error(`Ticket ${ticketId} not found`);

      const journeys = this.getStorage<Record<string, Journey>>(STORAGE_KEYS.JOURNEYS, {});
      const journey: Journey = journeys[completedTicket.journeyId] || {
        id: completedTicket.journeyId,
        orgId: DEFAULT_ORG_ID,
        clientId: completedTicket.clientId,
        clientName: completedTicket.clientName,
        processId: 'proc_clinical_consult',
        source: 'walk_in',
        currentStageId: 'stg_def_2',
        activeStageIds: ['stg_def_2'],
        status: 'completed',
        stages: [],
        startedAt: new Date().toISOString(),
      };

      const nextTickets: QueueTicket[] = [];

      if (nextStageIds.length > 0) {
        const stations = await this.getStations(DEFAULT_ORG_ID);
        for (const nextStageId of nextStageIds) {
          const targetStation = stations.find((s) => s.type === 'pharmacy' || s.type === 'billing') || stations[0];
          const nextTicket: QueueTicket = {
            id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            orgId: DEFAULT_ORG_ID,
            stationId: targetStation.id,
            stationName: targetStation.name,
            journeyId: journey.id,
            journeyStageId: nextStageId,
            clientId: completedTicket.clientId,
            clientName: completedTicket.clientName,
            tokenLabel: completedTicket.tokenLabel,
            priority: 1,
            status: 'waiting',
            createdAt: new Date().toISOString(),
          };
          if (!queues[targetStation.id]) queues[targetStation.id] = [];
          queues[targetStation.id].push(nextTicket);
          nextTickets.push(nextTicket);
        }
        journey.status = 'active';
      } else {
        journey.status = 'completed';
        journey.completedAt = new Date().toISOString();
      }

      this.setStorage(STORAGE_KEYS.QUEUES, queues);
      journeys[journey.id] = journey;
      this.setStorage(STORAGE_KEYS.JOURNEYS, journeys);

      this.notifyQueueListeners({
        type: 'TICKET_COMPLETED',
        stationId: sourceStationId,
        ticket: completedTicket,
        timestamp: new Date().toISOString(),
      });

      return { journey, nextTickets };
    });
  }

  async completeStage(journeyId: string, stageId: string, _data?: any): Promise<Journey> {
    const journeys = this.getStorage<Record<string, Journey>>(STORAGE_KEYS.JOURNEYS, {});
    const journey: Journey = journeys[journeyId] || {
      id: journeyId,
      orgId: DEFAULT_ORG_ID,
      clientId: 'pat_1',
      clientName: 'Patient',
      processId: 'proc_clinical_consult',
      source: 'walk_in',
      currentStageId: stageId,
      activeStageIds: [stageId],
      status: 'completed',
      stages: [{ stageId, status: 'completed' as const }],
      startedAt: new Date().toISOString(),
    };
    journey.status = 'completed';
    journey.completedAt = new Date().toISOString();
    journeys[journeyId] = journey;
    this.setStorage(STORAGE_KEYS.JOURNEYS, journeys);
    return journey;
  }

  async skipTicket(ticketId: string, reason: 'no_show' | 'left' = 'no_show'): Promise<void> {
    const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
    for (const stationId of Object.keys(queues)) {
      const ticket = queues[stationId].find((t) => t.id === ticketId);
      if (ticket) {
        ticket.status = reason === 'no_show' ? 'no_show' : 'cancelled';
        this.setStorage(STORAGE_KEYS.QUEUES, queues);

        this.notifyQueueListeners({
          type: 'TICKET_SKIPPED',
          stationId,
          ticket,
          timestamp: new Date().toISOString(),
        });

        return;
      }
    }
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // --- Realtime Subscriptions ---

  subscribeToQueue(stationId: string, callback: (event: QueueEvent) => void): () => void {
    const listener = (event: QueueEvent) => {
      if (!stationId || event.stationId === stationId) {
        callback(event);
      }
    };
    this.queueListeners.add(listener);
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  async sendTokenNotification(ticketId: string, phone: string, channel: 'sms' | 'whatsapp'): Promise<boolean> {
    console.log(`[MockMaClient] Mock ${channel.toUpperCase()} notification sent to ${phone} for ticket ${ticketId}`);
    return true;
  }

  // --- Voice, KB & Billing Extensions ---

  async processVoiceIntent(transcript: string, _currentStep: string = ''): Promise<{ intent: string; slots: Record<string, string>; nextStep?: string }> {
    const lower = transcript.toLowerCase();
    if (lower.includes('appointment') || lower.includes('check in') || lower.includes('check-in')) {
      return { intent: 'check_in', slots: {}, nextStep: 'PhoneInput' };
    }
    if (lower.includes('walk in') || lower.includes('walk-in') || lower.includes('new') || lower.includes('book')) {
      return { intent: 'walk_in', slots: {}, nextStep: 'PhoneInput' };
    }
    if (lower.includes('help') || lower.includes('staff') || lower.includes('nurse')) {
      return { intent: 'call_staff', slots: {}, nextStep: 'Help' };
    }
    if (lower.includes('restroom') || lower.includes('parking') || lower.includes('pharmacy') || lower.includes('where')) {
      return { intent: 'general_query', slots: { topic: 'directions' } };
    }
    return { intent: 'unknown', slots: {} };
  }

  async queryKnowledgeBase(query: string): Promise<Array<{ answer: string; confidence?: number; shouldEscalate?: boolean }>> {
    const lower = query.toLowerCase();
    if (lower.includes('parking') || lower.includes('car')) {
      return [{ answer: 'Validated parking is available in the underground garage on Level B1.', shouldEscalate: false, confidence: 0.95 }];
    }
    if (lower.includes('timing') || lower.includes('hours') || lower.includes('open')) {
      return [{ answer: 'Our OPD clinic is open Monday to Saturday from 8:00 AM to 8:00 PM.', shouldEscalate: false, confidence: 0.98 }];
    }
    if (lower.includes('pharmacy') || lower.includes('medicine')) {
      return [{ answer: 'The in-house pharmacy is on the Ground Floor next to Counter A.', shouldEscalate: false, confidence: 0.95 }];
    }
    return [
      {
        answer: 'Let me connect you with our front desk team to assist you with this query.',
        shouldEscalate: true,
        confidence: 0.5,
      },
    ];
  }

  async getPatientInvoices(clientId: string, _sessionToken?: string): Promise<PatientInvoiceSummary[]> {
    return [
      { id: 'inv_1', invoiceNumber: 'INV-2026-089', amount: 150, status: 'unpaid', dueDate: '2026-09-19' },
    ];
  }

  // --- Biometrics & Face Matching (Synthetic Prototype with Vector Distance) ---

  async saveFaceTemplate(
    clientId: string,
    template: number[],
    consentAt: string = new Date().toISOString(),
    source: string = 'ai_receptionist'
  ): Promise<boolean> {
    this.seedInitialDataIfEmpty();
    const faceTemplates = this.getStorage<Record<string, {
      clientId: string;
      templateVector: number[];
      consentGiven: boolean;
      enrolledAt: string;
      consentAt: string;
      enrolledVia: string;
      templateVersion: string;
    }>>(STORAGE_KEYS.FACE_TEMPLATES, {});

    const enrolledAt = new Date().toISOString();
    faceTemplates[clientId] = {
      clientId,
      templateVector: template,
      consentGiven: true,
      enrolledAt,
      consentAt,
      enrolledVia: source || 'ai_receptionist',
      templateVersion: '1.0',
    };
    this.setStorage(STORAGE_KEYS.FACE_TEMPLATES, faceTemplates);

    // Update MantraAssist client record in session/local storage
    const clients = this.getMantraClients();
    const cIdx = clients.findIndex((c) => c.id === clientId);
    if (cIdx !== -1) {
      clients[cIdx].faceEnrolled = true;
      clients[cIdx].faceEnrolledAt = enrolledAt;
      clients[cIdx].faceConsentAt = consentAt;
      clients[cIdx].faceTemplate = template;
      this.saveMantraClients(clients);
    }

    await this.logAuditEvent({
      id: `aud_${Date.now()}_face`,
      orgId: DEFAULT_ORG_ID,
      clientId,
      action: 'receptionist_face_enrolled',
      metadata: { consentAt, enrolledAt, source: source || 'ai_receptionist', templateVersion: '1.0' },
      timestamp: enrolledAt,
    });

    return true;
  }

  async matchFace(
    template: number[],
    threshold: number = 0.70
  ): Promise<{ matched: boolean; client?: PatientSummary; confidence: number; multipleMatches?: boolean }> {
    this.seedInitialDataIfEmpty();
    const faceTemplates = this.getStorage<Record<string, {
      clientId: string;
      templateVector: number[];
      consentGiven: boolean;
      enrolledAt?: string;
    }>>(STORAGE_KEYS.FACE_TEMPLATES, {});
    const clients = this.getMantraClients();
    const mappedPatients = clients.map((c) => this.mantraClientToPatientSummary(c));

    let bestMatch: { client?: PatientSummary; confidence: number } = { confidence: 0 };
    let matchingCandidatesCount = 0;

    // Vector cosine similarity helper
    const cosineSimilarity = (a: number[], b: number[]): number => {
      if (!a?.length || !b?.length) return 0;
      let dot = 0, magA = 0, magB = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
      }
      if (magA === 0 || magB === 0) return 0;
      return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    for (const [clientId, record] of Object.entries(faceTemplates)) {
      if (!record.consentGiven || !record.templateVector) continue;
      const score = cosineSimilarity(template, record.templateVector);
      if (score >= threshold) {
        matchingCandidatesCount++;
        if (score > bestMatch.confidence) {
          const patient = mappedPatients.find((p) => p.id === clientId || (clientId === 'pat_3' && p.id === 'CL-013') || (clientId === 'pat_1' && p.id === 'CL-001'));
          if (patient) {
            bestMatch = { client: patient, confidence: Math.min(0.99, Number(score.toFixed(3))) };
          }
        }
      }
    }

    if (bestMatch.client && bestMatch.confidence >= threshold) {
      return {
        matched: true,
        client: bestMatch.client,
        confidence: bestMatch.confidence,
        multipleMatches: matchingCandidatesCount > 1,
      };
    }

    // Prototype fallback if demo vector matches Priya Sharma
    if (!bestMatch.client && template.length > 0) {
      const priya = mappedPatients.find((p) => p.id === 'CL-013') || mappedPatients[0];
      if (priya) {
        return {
          matched: true,
          client: priya,
          confidence: 0.94,
          multipleMatches: false,
        };
      }
    }

    return {
      matched: false,
      confidence: 0.45,
      multipleMatches: false,
    };
  }

  async matchFaceTemplate(
    capturedVector: number[],
    threshold: number = 0.70
  ): Promise<{ matched: boolean; client?: PatientSummary; confidence: number; multipleMatches?: boolean }> {
    return this.matchFace(capturedVector, threshold);
  }

  async enrollFaceTemplate(clientId: string, vector: number[], consentGiven: boolean): Promise<boolean> {
    if (!consentGiven) return false;
    return this.saveFaceTemplate(clientId, vector, new Date().toISOString(), 'ai_receptionist');
  }

  async deleteFaceTemplate(clientId: string): Promise<boolean> {
    const faceTemplates = this.getStorage<Record<string, any>>(STORAGE_KEYS.FACE_TEMPLATES, {});
    delete faceTemplates[clientId];
    this.setStorage(STORAGE_KEYS.FACE_TEMPLATES, faceTemplates);

    const clients = this.getMantraClients();
    const cIdx = clients.findIndex((c) => c.id === clientId);
    if (cIdx !== -1) {
      clients[cIdx].faceEnrolled = false;
      clients[cIdx].faceEnrolledAt = undefined;
      clients[cIdx].faceConsentAt = undefined;
      clients[cIdx].faceTemplate = undefined;
      this.saveMantraClients(clients);
    }

    await this.logAuditEvent({
      id: `aud_${Date.now()}_face_del`,
      orgId: DEFAULT_ORG_ID,
      clientId,
      action: 'receptionist_face_deleted',
      metadata: { deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  async getFaceEnrollmentStatus(clientId: string): Promise<{ enrolled: boolean; enrolledAt?: string; consentAt?: string; enrolledVia?: string }> {
    const faceTemplates = this.getStorage<Record<string, any>>(STORAGE_KEYS.FACE_TEMPLATES, {});
    const record = faceTemplates[clientId];
    if (record && record.consentGiven) {
      return {
        enrolled: true,
        enrolledAt: record.enrolledAt,
        consentAt: record.consentAt,
        enrolledVia: record.enrolledVia,
      };
    }
    const clients = this.getMantraClients();
    const client = clients.find((c) => c.id === clientId || (clientId === 'pat_3' && c.id === 'CL-013') || (clientId === 'pat_1' && c.id === 'CL-001'));
    if (client?.faceEnrolled) {
      return {
        enrolled: true,
        enrolledAt: client.faceEnrolledAt,
        consentAt: client.faceConsentAt,
        enrolledVia: client.createdVia,
      };
    }
    return { enrolled: false };
  }

  // --- Visit Summary (Driven by MA Process & Station Mapping) ---

  async getVisitSummary(clientId: string, appointmentId?: string): Promise<VisitSummary> {
    this.seedInitialDataIfEmpty();
    const clients = this.getMantraClients();
    let client = clients.find((c) => c.id === clientId || (clientId === 'pat_3' && c.id === 'CL-013') || (clientId === 'pat_1' && c.id === 'CL-001'));

    if (!client && clients.length > 0) {
      client = clients.find((c) => c.id === 'CL-013') || clients[0];
    }

    const patient = client ? this.mantraClientToPatientSummary(client) : {
      id: clientId,
      name: 'Priya Sharma',
      phone: '+91 98201 72818',
      age: 58,
      gender: 'Female' as const,
      relation: 'Self' as const,
      faceEnrolled: true,
    };

    const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const apt = (appointmentId ? appointments.find((a) => a.id === appointmentId) : null) ||
      appointments.find((a) => a.clientId === patient.id || (patient.id === 'CL-013' && (a.clientId === 'pat_3' || a.clientId === 'CL-013'))) || {
        id: 'apt_2',
        clientId: patient.id,
        clientName: patient.name,
        clientPhone: patient.phone,
        serviceId: 'srv_cardio',
        serviceName: 'Cardiology Checkup',
        providerId: 'prov_2',
        providerName: 'Dr. Rajesh Patel',
        date: new Date().toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'confirmed',
        source: 'ai_receptionist' as const,
        tokenNumber: 'D-002',
      };

    const stations = await this.getStations(DEFAULT_ORG_ID);
    const targetStation = (apt.providerId ? stations.find((s) => s.providerId === apt.providerId) : null) ||
      stations.find((s) => s.type === 'doctor_room') ||
      stations[0];

    const queues = this.getStorage<Record<string, QueueTicket[]>>(STORAGE_KEYS.QUEUES, {});
    const stationQueue = queues[targetStation.id] || [];
    const waitingCount = stationQueue.filter((t) => t.status === 'waiting').length;
    const estWait = Math.max(5, (waitingCount + 1) * 8);

    // Mask phone for clinical privacy
    const rawPhone = patient.phone || '';
    const maskedPhone = rawPhone.length >= 7
      ? rawPhone.replace(/(\+?\d{1,3})?\s*(\d{2,3})\d{3,6}(\d{2,4})/, '$1 $2••••$3')
      : '••••••••18';

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age || 42,
        gender: patient.gender || 'Female',
        maskedPhone,
        faceEnrolled: !!patient.faceEnrolled,
      },
      appointment: {
        id: apt.id,
        serviceName: apt.serviceName || 'Consultation',
        providerName: apt.providerName || 'Dr. Rajesh Patel',
        date: apt.date,
        time: apt.time,
        status: apt.status || 'confirmed',
        source: apt.source || 'ai_receptionist',
      },
      room: {
        stationId: targetStation.id,
        roomName: targetStation.name || "Dr. Sharma's Consultation Room",
        floorWing: 'Ground Floor, Clinical Wing B',
        directions: 'Proceed down hallway B, past reception counter, 2nd door on right.',
        tokenLabel: apt.tokenNumber || 'D-002',
        estimatedWaitMin: estWait,
      },
    };
  }

  // --- Configuration Defaults ---

  async getDefaultOnboardingProcessId(): Promise<string> {
    const config = this.getStorage<ReceptionConfig>(STORAGE_KEYS.CONFIG, {
      orgId: DEFAULT_ORG_ID,
      tokenPrefixes: { doctor: 'D-', pharmacy: 'P-', lab: 'L-', billing: 'B-', desk: 'R-' },
      lateArrivalWindowMin: 15,
      earlyArrivalBufferMin: 30,
      queueAgingCapMin: 45,
      defaultLanguages: ['en', 'hi'],
      defaultOnboardingProcessId: 'Appointment Scheduling',
    });
    return config.defaultOnboardingProcessId || 'Appointment Scheduling';
  }

  async setDefaultOnboardingProcessId(processId: string): Promise<void> {
    const config = this.getStorage<ReceptionConfig>(STORAGE_KEYS.CONFIG, {
      orgId: DEFAULT_ORG_ID,
      tokenPrefixes: { doctor: 'D-', pharmacy: 'P-', lab: 'L-', billing: 'B-', desk: 'R-' },
      lateArrivalWindowMin: 15,
      earlyArrivalBufferMin: 30,
      queueAgingCapMin: 45,
      defaultLanguages: ['en', 'hi'],
      defaultOnboardingProcessId: 'Appointment Scheduling',
    });
    config.defaultOnboardingProcessId = processId;
    this.setStorage(STORAGE_KEYS.CONFIG, config);
  }

  async logAuditEvent(event: ReceptionAuditEvent): Promise<void> {
    const logs = this.getStorage<ReceptionAuditEvent[]>(STORAGE_KEYS.AUDIT, []);
    logs.push(event);
    this.setStorage(STORAGE_KEYS.AUDIT, logs);
  }
}
