/**
 * mockMaClient.ts
 * Path: src/reception/lib/api/mockMaClient.ts
 *
 * Front-end mock implementation of IMaClient for AI Receptionist.
 * Operates over localStorage and in-memory state.
 * Operates exclusively on synthetic/demo data.
 */

import type { IMaClient } from './maClient';
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
  PATIENTS: 'ma_reception_mock_patients',
  APPOINTMENTS: 'ma_reception_mock_appointments',
  FACE_TEMPLATES: 'ma_reception_face_templates',
};

const DEFAULT_ORG_ID = 'org_mantracare_default';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class MockMaClient implements IMaClient {
  private static sharedMemoryStorage: Record<string, string> = {};
  private queueListeners: Set<(event: QueueEvent) => void> = new Set();

  static resetStorage(): void {
    MockMaClient.sharedMemoryStorage = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
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
      const initialStations: Station[] = [
        {
          id: 'st-consult-1',
          orgId: DEFAULT_ORG_ID,
          name: "Dr. Sharma's Consultation Room",
          type: 'doctor_room',
          providerId: 'prov_1',
          providerName: 'Dr. Ananya Sharma',
          roomNumber: '101',
          floorWing: 'Ground Floor, Clinical Wing B',
          directions: 'Proceed down hallway B, past reception counter, 2nd door on right.',
          categoryId: 'cat_clinical',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-consult-2',
          orgId: DEFAULT_ORG_ID,
          name: 'Dr. Rajesh Patel - Cardiology',
          type: 'doctor_room',
          providerId: 'prov_2',
          providerName: 'Dr. Rajesh Patel',
          roomNumber: '102',
          floorWing: 'Ground Floor, Clinical Wing B',
          directions: 'Walk past reception, take hallway B on the right, room 102 is the 3rd door on the right.',
          categoryId: 'cat_clinical',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'st-consult-3',
          orgId: DEFAULT_ORG_ID,
          name: 'Dr. Priya Nair - Pediatrics',
          type: 'doctor_room',
          providerId: 'prov_3',
          providerName: 'Dr. Priya Nair',
          roomNumber: '204',
          floorWing: '1st Floor, Specialty Wing',
          directions: 'Take the central elevator to the 1st floor, turn left, Room 204 is on the left.',
          categoryId: 'cat_clinical',
          active: true,
          createdAt: new Date().toISOString(),
        },
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

    // 3. Mock Patients & Appointments & Face Biometrics
    const existingPatients = this.getStorage<PatientSummary[] | null>(STORAGE_KEYS.PATIENTS, null);
    if (!existingPatients || existingPatients.length === 0) {
      const demoPatients: PatientSummary[] = [
        { id: 'pat_1', name: 'Eleanor Vance', phone: '+1 (555) 234-5678', age: 34, gender: 'Female', relation: 'Self', faceEnrolled: true, faceEnrolledAt: '2026-08-14T09:30:00Z', createdVia: 'ai_receptionist', defaultProcessId: 'Appointment Scheduling' },
        { id: 'pat_2', name: 'Rohan Verma', phone: '+91 98765 43210', age: 34, gender: 'Male', relation: 'Self', faceEnrolled: false, createdVia: 'web', defaultProcessId: 'Patient Intake' },
        { id: 'pat_3', name: 'Sunita Rao', phone: '+91 91234 56780', age: 58, gender: 'Female', relation: 'Self', faceEnrolled: true, faceEnrolledAt: '2026-09-02T11:15:00Z', createdVia: 'ai_receptionist', defaultProcessId: 'Appointment Scheduling' },
      ];
      this.setStorage(STORAGE_KEYS.PATIENTS, demoPatients);

      const todayStr = new Date().toISOString().split('T')[0];
      const demoAppointments: AppointmentSummary[] = [
        {
          id: 'apt-101',
          clientId: 'pat_1',
          clientName: 'Eleanor Vance',
          clientPhone: '+1 (555) 234-5678',
          serviceId: 'srv_consult',
          serviceName: 'General Consultation',
          providerId: 'prov_1',
          providerName: 'Dr. Ananya Sharma',
          date: todayStr,
          time: '10:30 AM',
          status: 'confirmed',
          receptionEnabled: true,
          source: 'ai_receptionist',
          roomStationId: 'st-consult-1',
          roomName: 'Dr. Sharma - Room 101',
          tokenNumber: 'D-001',
        },
        {
          id: 'apt_2',
          clientId: 'pat_3',
          clientName: 'Sunita Rao',
          clientPhone: '+91 91234 56780',
          serviceId: 'srv_cardio',
          serviceName: 'Cardiology Checkup',
          providerId: 'prov_2',
          providerName: 'Dr. Rajesh Patel',
          date: todayStr,
          time: '11:00 AM',
          status: 'confirmed',
          receptionEnabled: true,
          source: 'ai_receptionist',
          roomStationId: 'st-consult-1',
          roomName: 'Dr. Sharma - Room 101',
          tokenNumber: 'D-002',
        },
      ];
      this.setStorage(STORAGE_KEYS.APPOINTMENTS, demoAppointments);

      // Seed Face Templates (biometric embeddings prototype)
      const demoFaceTemplates: Record<string, { clientId: string; templateVector: number[]; consentGiven: boolean; enrolledAt: string }> = {
        pat_3: {
          clientId: 'pat_3',
          templateVector: [0.38, 0.74, 0.22, 0.91, 0.55, 0.18, 0.63, 0.87],
          consentGiven: true,
          enrolledAt: '2026-09-02T11:15:00Z',
        },
        pat_1: {
          clientId: 'pat_1',
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

  // --- Rooms / Stations ---

  async getStations(orgId: string = DEFAULT_ORG_ID): Promise<Station[]> {
    this.seedInitialDataIfEmpty();
    const stations = this.getStorage<Station[]>(STORAGE_KEYS.STATIONS, []);
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
    const norm = this.normalizePhone(phone);
    console.log(`[MockMaClient] Demo OTP sent to ${norm}: 1234`);
    return {
      success: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; sessionToken: string }> {
    // In mock demo, '1234' is universal accepted OTP
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
    const norm = this.normalizePhone(phone);
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    return patients.filter((p) => this.normalizePhone(p.phone) === norm);
  }

  async lookupPatientByPhone(phone: string): Promise<{ found: boolean; patient?: PatientSummary }> {
    const matches = await this.lookupClientsByPhone(phone);
    if (matches.length > 0) {
      return { found: true, patient: matches[0] };
    }
    return { found: false };
  }

  async createWalkInClient(data: CreatePatientPayload, _sessionToken?: string): Promise<PatientSummary> {
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    const config = this.getStorage<ReceptionConfig>(STORAGE_KEYS.CONFIG, {
      orgId: DEFAULT_ORG_ID,
      tokenPrefixes: { doctor: 'D-', pharmacy: 'P-', lab: 'L-', billing: 'B-', desk: 'R-' },
      lateArrivalWindowMin: 15,
      earlyArrivalBufferMin: 30,
      queueAgingCapMin: 45,
      defaultLanguages: ['en', 'hi'],
      defaultOnboardingProcessId: 'Appointment Scheduling',
    });

    const defaultProcess = config.defaultOnboardingProcessId || 'Appointment Scheduling';
    const newPatient: PatientSummary = {
      id: `pat_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      age: data.age,
      gender: data.gender,
      email: data.email,
      relation: 'Self',
      faceEnrolled: !!data.faceEnrolled,
      faceEnrolledAt: data.faceEnrolled ? new Date().toISOString() : undefined,
      createdVia: data.createdVia || 'ai_receptionist',
      defaultProcessId: defaultProcess,
    };
    patients.push(newPatient);
    this.setStorage(STORAGE_KEYS.PATIENTS, patients);

    // If face template vector provided, save biometric template
    if (data.faceEnrolled && data.faceTemplate && data.consentGiven) {
      await this.saveFaceTemplate(newPatient.id, data.faceTemplate, data.consentAt || new Date().toISOString(), 'ai_receptionist');
    } else {
      await this.logAuditEvent({
        id: `aud_${Date.now()}_face_skip`,
        orgId: DEFAULT_ORG_ID,
        clientId: newPatient.id,
        action: 'receptionist_face_skipped',
        metadata: { reason: 'patient_skipped_or_declined' },
        timestamp: new Date().toISOString(),
      });
    }

    // Log Activity Events to MA audit feed
    await this.logAuditEvent({
      id: `aud_${Date.now()}`,
      orgId: DEFAULT_ORG_ID,
      clientId: newPatient.id,
      action: 'receptionist_onboarding_completed',
      metadata: { name: newPatient.name, phone: newPatient.phone, createdVia: 'ai_receptionist' },
      timestamp: new Date().toISOString(),
    });

    await this.logAuditEvent({
      id: `aud_${Date.now()}_proc`,
      orgId: DEFAULT_ORG_ID,
      clientId: newPatient.id,
      action: 'process_assigned',
      metadata: { processName: defaultProcess, assignedVia: 'receptionist_default_rule' },
      timestamp: new Date().toISOString(),
    });

    return newPatient;
  }

  // --- Booking & Appointments ---

  async getTodayAppointments(clientId: string, _sessionToken?: string): Promise<AppointmentSummary[]> {
    this.seedInitialDataIfEmpty();
    const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
    return appointments.filter((a) => a.clientId === clientId);
  }

  async getServices(orgId: string = DEFAULT_ORG_ID): Promise<ServiceItem[]> {
    return [
      { id: 'srv_consult', orgId, name: 'General Physician Consultation', category: 'Doctor', durationMin: 15, basePrice: 500, receptionEnabled: true },
      { id: 'srv_cardio', orgId, name: 'Cardiology Specialist Consult', category: 'Specialist', durationMin: 30, basePrice: 1200, receptionEnabled: true },
      { id: 'srv_dental', orgId, name: 'Dental Clean & Polish', category: 'Dental', durationMin: 30, basePrice: 800, receptionEnabled: true },
    ];
  }

  async getProviders(orgId: string = DEFAULT_ORG_ID, serviceId?: string): Promise<ProviderItem[]> {
    const allProviders: ProviderItem[] = [
      { id: 'prov_1', orgId, name: 'Dr. Ananya Sharma', specialty: 'General Physician', specialization: 'Family Medicine', assignedStationId: 'st-consult-1', availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      { id: 'prov_2', orgId, name: 'Dr. Rajesh Patel', specialty: 'Cardiologist', specialization: 'Interventional Cardiology', assignedStationId: 'st-consult-1', availableDays: ['Mon', 'Wed', 'Fri'] },
      { id: 'prov_3', orgId, name: 'Dr. Priya Desai', specialty: 'Dentist', specialization: 'Orthodontics', assignedStationId: 'st-consult-1', availableDays: ['Tue', 'Thu', 'Sat'] },
    ];
    if (serviceId === 'srv_cardio') return allProviders.filter((p) => p.id === 'prov_2');
    if (serviceId === 'srv_dental') return allProviders.filter((p) => p.id === 'prov_3');
    return allProviders;
  }

  async getSlots(_serviceId: string, _date: string, _providerId?: string): Promise<TimeSlot[]> {
    return [
      { id: 'slot_1', time: '09:00 AM', startTime: '09:00 AM', endTime: '09:30 AM', available: true },
      { id: 'slot_2', time: '09:30 AM', startTime: '09:30 AM', endTime: '10:00 AM', available: true },
      { id: 'slot_3', time: '10:00 AM', startTime: '10:00 AM', endTime: '10:30 AM', available: false },
      { id: 'slot_4', time: '10:30 AM', startTime: '10:30 AM', endTime: '11:00 AM', available: true },
      { id: 'slot_5', time: '11:00 AM', startTime: '11:00 AM', endTime: '11:30 AM', available: true },
      { id: 'slot_6', time: '11:30 AM', startTime: '11:30 AM', endTime: '12:00 PM', available: true },
      { id: 'slot_7', time: '02:00 PM', startTime: '02:00 PM', endTime: '02:30 PM', available: true },
      { id: 'slot_8', time: '02:30 PM', startTime: '02:30 PM', endTime: '03:00 PM', available: true },
      { id: 'slot_9', time: '03:00 PM', startTime: '03:00 PM', endTime: '03:30 PM', available: true },
      { id: 'slot_10', time: '04:00 PM', startTime: '04:00 PM', endTime: '04:30 PM', available: true },
    ];
  }

  async bookAppointment(
    data: BookAppointmentPayload,
    _sessionToken: string = '',
    idempotencyKey: string = ''
  ): Promise<AppointmentSummary> {
    return this.withIdempotency(idempotencyKey, async () => {
      this.seedInitialDataIfEmpty();
      const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
      const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
      const patient = patients.find((p) => p.id === data.clientId);

      const services = await this.getServices();
      const srv = services.find((s) => s.id === data.serviceId);

      const providers = await this.getProviders();
      const prov = providers.find((p) => p.id === data.providerId) || providers[0];

      const stations = await this.getStations();
      const targetStation = stations.find((s) => s.type === 'doctor_room') || stations[0];

      const tokenNumber = `D-${String(appointments.length + 1).padStart(3, '0')}`;

      const newApt: AppointmentSummary = {
        id: `apt_${Date.now()}`,
        clientId: data.clientId,
        clientName: patient?.name || 'Patient',
        clientPhone: patient?.phone || '',
        serviceId: data.serviceId,
        serviceName: srv?.name || 'General Consultation',
        providerId: prov?.id || 'prov_1',
        providerName: prov?.name || 'Dr. Ananya Sharma',
        date: data.date,
        time: data.time,
        status: 'confirmed',
        receptionEnabled: true,
        source: data.source || 'ai_receptionist',
        roomStationId: targetStation.id,
        roomName: targetStation.name,
        tokenNumber,
      };

      appointments.push(newApt);
      this.setStorage(STORAGE_KEYS.APPOINTMENTS, appointments);

      // Sync with sessionStorage appointments_v1 for MA Appointments page
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const maApts = JSON.parse(sessionStorage.getItem('appointments_v1') || '[]');
          const numericId = Date.now();
          maApts.unshift({
            id: numericId,
            clientName: patient?.name || 'Patient',
            clientEmail: patient?.email || 'patient@example.com',
            clientPhone: patient?.phone || '',
            employeeId: prov?.id === 'prov_2' ? 2 : 1,
            serviceId: data.serviceId === 'srv_cardio' ? 2 : 1,
            date: data.date,
            time: data.time.replace(/ AM| PM/i, ''),
            duration: srv?.durationMin || 30,
            status: 'scheduled',
            notes: data.reason || 'Booked via AI Receptionist',
            source: 'ai_receptionist',
            roomName: targetStation.name,
            tokenNumber,
            processId: 'Appointment Scheduling',
            stageId: 'Confirmed',
          });
          sessionStorage.setItem('appointments_v1', JSON.stringify(maApts));
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

      const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
      const patient = patients.find((p) => p.id === clientId) || {
        id: clientId,
        name: apt?.clientName || 'Patient',
        phone: apt?.clientPhone || '',
        relation: 'Self' as const,
      };

      const stations = await this.getStations(DEFAULT_ORG_ID);
      const targetStation =
        (apt?.providerId ? stations.find((s) => s.providerId === apt.providerId) : null) ||
        stations.find((s) => s.type === 'doctor_room') ||
        stations.find((s) => s.type === 'desk') ||
        stations[0];

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
      const tokenLabel = `${prefix}${tokenNum}`;

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
        stationName: targetStation.name,
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
        });
      }

      const checkinRes = await this.checkinAppointment('', patient.id, '', '');
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

    // Update patient record
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    const pIdx = patients.findIndex((p) => p.id === clientId);
    if (pIdx !== -1) {
      patients[pIdx].faceEnrolled = true;
      patients[pIdx].faceEnrolledAt = enrolledAt;
      patients[pIdx].faceConsentAt = consentAt;
      patients[pIdx].faceEnrolledVia = source || 'ai_receptionist';
      patients[pIdx].faceTemplateVersion = '1.0';
      patients[pIdx].faceTemplate = template;
      this.setStorage(STORAGE_KEYS.PATIENTS, patients);
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
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);

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
          const patient = patients.find((p) => p.id === clientId);
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

    // Prototype fallback if demo vector matches Sunita
    if (!bestMatch.client && template.length > 0) {
      const sunita = patients.find((p) => p.id === 'pat_3') || patients[0];
      if (sunita) {
        return {
          matched: true,
          client: sunita,
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

    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    const pIdx = patients.findIndex((p) => p.id === clientId);
    if (pIdx !== -1) {
      patients[pIdx].faceEnrolled = false;
      patients[pIdx].faceEnrolledAt = undefined;
      patients[pIdx].faceConsentAt = undefined;
      patients[pIdx].faceTemplate = undefined;
      this.setStorage(STORAGE_KEYS.PATIENTS, patients);
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
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    const patient = patients.find((p) => p.id === clientId);
    if (patient?.faceEnrolled) {
      return {
        enrolled: true,
        enrolledAt: patient.faceEnrolledAt,
        consentAt: patient.faceConsentAt,
        enrolledVia: patient.faceEnrolledVia,
      };
    }
    return { enrolled: false };
  }

  // --- Visit Summary (Driven by MA Process & Station Mapping) ---

  async getVisitSummary(clientId: string, appointmentId?: string): Promise<VisitSummary> {
    this.seedInitialDataIfEmpty();
    const patients = this.getStorage<PatientSummary[]>(STORAGE_KEYS.PATIENTS, []);
    let patient = patients.find((p) => p.id === clientId);

    if (!patient) {
      patient = {
        id: clientId,
        name: 'Sunita Rao',
        phone: '+91 91234 56780',
        age: 58,
        gender: 'Female',
        relation: 'Self',
        faceEnrolled: true,
      };
    }

    const appointments = this.getStorage<AppointmentSummary[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const apt = (appointmentId ? appointments.find((a) => a.id === appointmentId) : null) ||
      appointments.find((a) => a.clientId === clientId) || {
        id: 'apt_2',
        clientId: patient.id,
        clientName: patient.name,
        clientPhone: patient.phone,
        serviceId: 'srv_cardio',
        serviceName: 'Cardiology Specialist Checkup',
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
      : '••••••••80';

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
        roomName: targetStation.name || 'Dr. Sharma - Room 101',
        floorWing: 'Ground Floor, Clinical Wing B',
        directions: 'Proceed down hallway B, past reception counter, 2nd door on right.',
        tokenLabel: apt.tokenNumber || 'D-042',
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
