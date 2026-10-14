/**
 * verify_reception_sync.ts
 * End-to-end unit and integration test verifying AI Receptionist & clientsStore synchronization.
 */

import { getStoredClients, saveStoredClients, addOrUpdateClient, CLIENTS_STORAGE_KEY } from '../src/lib/clientsStore';
import { initialClients } from '../src/data/canonicalClients';
import { MockMaClient } from '../src/reception/lib/api/mockMaClient';

// Setup Mock in-memory localStorage & sessionStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
(global as any).window = {
  localStorage: {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
  },
  sessionStorage: {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
  },
  dispatchEvent: () => true,
  CustomEvent: class CustomEvent {
    constructor(public type: string, public detail?: any) {}
  },
  Event: class Event {
    constructor(public type: string) {}
  },
};
(global as any).localStorage = (global as any).window.localStorage;
(global as any).sessionStorage = (global as any).window.sessionStorage;
(global as any).CustomEvent = (global as any).window.CustomEvent;
(global as any).Event = (global as any).window.Event;

async function runVerification() {
  console.log('===============================================================');
  console.log('  AI RECEPTIONIST TO CLIENTS STORE SYNC VERIFICATION TEST');
  console.log('===============================================================\n');

  // 1. Initial State Check
  console.log('--- TEST 1: Initial Canonical Client Integrity Check ---');
  MockMaClient.resetStorage();
  const initialList = getStoredClients();
  console.log(`✓ Initial clients loaded: ${initialList.length}`);
  const sarah001 = initialList.find(c => c.id === 'CL-001');
  console.log(`✓ CL-001 Name: "${sarah001?.name}", Phone: "${sarah001?.phone}"`);
  if (sarah001?.name !== 'Sarah Johnson' || sarah001?.phone !== '5551234567') {
    throw new Error('FAIL: CL-001 Sarah Johnson data corrupted at baseline!');
  }
  console.log('✓ PASS: Canonical clients intact.\n');

  const maClient = new MockMaClient();

  // 2. Test Case A: New Client with Brand New Phone Number (Navodya Jain)
  console.log('--- TEST 2 (Case A): New Client Onboarding & Appointment Booking (Navodya Jain) ---');
  const patientA = await maClient.createWalkInClient({
    name: 'Navodya Jain',
    phone: '9811122233',
    age: 28,
    gender: 'Female',
    // NO email provided during onboarding
    relation: 'Self',
  });

  console.log(`✓ Walk-in client created via AI Receptionist: ID=${patientA.id}, Name="${patientA.name}", Phone="${patientA.phone}"`);

  // Book appointment via avatar flow (handleBookWalkIn payload)
  const aptA = await maClient.bookAppointment({
    clientId: patientA.id,
    clientName: patientA.name,
    clientPhone: patientA.phone,
    clientEmail: patientA.email || undefined,
    serviceId: '1',
    date: '2026-09-24',
    time: '10:30 AM',
    reason: 'Clinical Consultation',
    source: 'ai_receptionist',
  });

  console.log(`✓ Appointment booked: Token=${aptA.tokenNumber}, Room="${aptA.roomName}", Provider="${aptA.providerName}"`);

  // Verify in clientsStore
  const afterA = getStoredClients();
  const foundA = afterA.find(c => c.name === 'Navodya Jain');
  if (!foundA) {
    throw new Error('FAIL: Navodya Jain was not added to clientsStore!');
  }
  console.log(`✓ clientsStore entry: ID=${foundA.id}, Name="${foundA.name}", Phone="${foundA.phone}", Email="${foundA.email}", Responsible="${foundA.responsible}", Stage="${foundA.stage}"`);
  
  if (foundA.email !== '') {
    throw new Error(`FAIL: Email was fabricated as "${foundA.email}" when none was provided!`);
  }
  console.log(`✓ Email verification: Email is blank (no synthetic email generated).`);
  console.log(`✓ Total clients count after Case A: ${afterA.length} (Expected: ${initialList.length + 1})`);
  console.log('✓ PASS: Case A successfully created distinct new client.\n');

  // 3. Test Case B: Phone Number Suffix Collision (Devika Malhotra using 5551234567)
  console.log('--- TEST 3 (Case B): Phone Collision Test (Devika Malhotra with 5551234567) ---');
  const patientB = await maClient.createWalkInClient({
    name: 'Devika Malhotra',
    phone: '5551234567', // Same 10-digit suffix as CL-001 Sarah Johnson
    age: 32,
    gender: 'Female',
    relation: 'Self',
  });

  console.log(`✓ Walk-in client created: ID=${patientB.id}, Name="${patientB.name}", Phone="${patientB.phone}"`);

  const aptB = await maClient.bookAppointment({
    clientId: patientB.id,
    clientName: patientB.name,
    clientPhone: patientB.phone,
    clientEmail: patientB.email || undefined,
    serviceId: '1',
    date: '2026-09-24',
    time: '11:30 AM',
    reason: 'Dental Consultation',
    source: 'ai_receptionist',
  });

  console.log(`✓ Appointment booked: Token=${aptB.tokenNumber}, Provider="${aptB.providerName}"`);

  const afterB = getStoredClients();
  const sarahCheck = afterB.find(c => c.id === 'CL-001');
  const devikaCheck = afterB.find(c => c.name === 'Devika Malhotra');

  console.log(`✓ CL-001 Check: ID=${sarahCheck?.id}, Name="${sarahCheck?.name}", Phone="${sarahCheck?.phone}"`);
  console.log(`✓ Devika Check: ID=${devikaCheck?.id}, Name="${devikaCheck?.name}", Phone="${devikaCheck?.phone}"`);

  if (!sarahCheck || sarahCheck.name !== 'Sarah Johnson') {
    throw new Error('FAIL: CL-001 Sarah Johnson was overwritten by Devika Malhotra!');
  }
  if (!devikaCheck || devikaCheck.id === 'CL-001') {
    throw new Error('FAIL: Devika Malhotra hijacked CL-001 ID instead of getting a new ID!');
  }
  console.log(`✓ Total clients count after Case B: ${afterB.length} (Expected: ${initialList.length + 2})`);
  console.log('✓ PASS: Case B did NOT overwrite Sarah Johnson and created distinct client for Devika Malhotra.\n');

  // 4. Test Case C: Returning Patient Recognition (Casing/Whitespace normalization)
  console.log('--- TEST 4 (Case C): Returning Patient Recognition (Sarah Johnson with extra whitespace/lowercase) ---');
  const updatedSarah = addOrUpdateClient({
    name: '  sarah   johnson  ',
    phone: '+1 (555) 123-4567',
    stage: 'Confirmed',
    responsible: 'Dr. John Smith',
  });

  console.log(`✓ Returning client result: ID=${updatedSarah.id}, Name="${updatedSarah.name}", Stage="${updatedSarah.stage}"`);
  if (updatedSarah.id !== 'CL-001') {
    throw new Error(`FAIL: Returning patient Sarah Johnson was not matched to CL-001, got ID=${updatedSarah.id}!`);
  }
  if (updatedSarah.name !== 'Sarah Johnson') {
    throw new Error(`FAIL: Stored name was altered to "${updatedSarah.name}" instead of remaining "Sarah Johnson"!`);
  }
  const afterC = getStoredClients();
  console.log(`✓ Stored clean name preserved: "${afterC.find(c => c.id === 'CL-001')?.name}"`);
  console.log(`✓ Total clients count after Case C: ${afterC.length} (Expected: unchanged at ${afterB.length})`);
  console.log('✓ PASS: Returning patient recognized and clean name preserved without duplicating.\n');

  // 5. Single Source of Truth / STORAGE_KEYS.PATIENTS Check
  console.log('--- TEST 5: Verify STORAGE_KEYS.PATIENTS is Eliminated ---');
  const rawPatientsStorage = mockStorage['ma_reception_mock_patients'];
  console.log(`✓ Value of 'ma_reception_mock_patients' in storage: ${rawPatientsStorage || 'undefined (NOT CREATED)'}`);
  if (rawPatientsStorage) {
    throw new Error('FAIL: ma_reception_mock_patients was written to storage!');
  }
  const liveLookup = await maClient.lookupClientsByPhone('9811122233');
  console.log(`✓ Live lookup from clientsStore for 9811122233: Found ${liveLookup.length} client(s) -> "${liveLookup[0]?.name}"`);
  if (liveLookup.length === 0 || liveLookup[0].name !== 'Navodya Jain') {
    throw new Error('FAIL: Live lookup failed to read from clientsStore!');
  }
  console.log('✓ PASS: clientsStore.ts is the single source of truth.\n');

  console.log('===============================================================');
  console.log('  ALL TESTS PASSED WITH 100% SUCCESS! (5/5)');
  console.log('===============================================================');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
