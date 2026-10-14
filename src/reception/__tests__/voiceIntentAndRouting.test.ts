/**
 * voiceIntentAndRouting.test.ts
 * Path: src/reception/__tests__/voiceIntentAndRouting.test.ts
 *
 * Tests for Two-Stage Voice Intent Resolution and Route Mapping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockMaClient } from '../lib/api/mockMaClient';
import type { DirectionCategory, DirectionRoom } from '../types/reception';

const APPOINTMENT_WORDS = [
  'appointment', 'booked', 'scheduled', 'check in', 'checkin', 'my doctor', 'my visit', 'visit',
  'अपॉइंटमेंट', 'चेक इन', 'चेकिन', 'बुक', 'डॉक्टर',
];

const WALKIN_WORDS = [
  'walk in', 'walk-in', 'walkin', 'new patient', 'no appointment', 'without appointment',
  'register', 'registration', 'first time', 'वॉक इन', 'वॉक-इन', 'नया मरीज', 'नया पेशेंट', 'रजिस्टर', 'पंजीकरण', 'पहली बार',
];

const PAYMENT_WORDS = [
  'pay', 'payment', 'bill', 'pay bill', 'pay my bill', 'invoice', 'billing', 'due', 'fees', 'fee',
  'भुगतान', 'पेमेंट', 'बिल', 'फीस',
];

const DIRECTIONS_WORDS = [
  'direction', 'directions', 'where is', 'where are', 'way to', 'how do i get to', 'find',
  'washroom', 'restroom', 'toilet', 'bathroom', 'parking', 'pharmacy located', 'pharmacy',
  'lab located', 'water', 'help desk', 'front desk', 'दिशा', 'कहाँ है', 'वॉशरूम', 'शौचालय',
  'टॉयलेट', 'पार्किंग', 'दवाखाना',
];

interface ResolveResult {
  intent: 'appointment' | 'walk_in' | 'payment' | 'directions_room' | 'directions_category' | 'directions_all' | 'fallback';
  targetUrl: string;
  matchedRoom?: DirectionRoom;
  matchedCategory?: DirectionCategory;
}

function resolveVoiceIntent(rawTranscript: string, categories: DirectionCategory[]): ResolveResult {
  const text = (rawTranscript || '').trim();
  const normalized = text.toLowerCase();

  // Priority 1: Specific Room Match across all categories (Room > Category > General Intent > Fallback)
  let matchedRoom: { room: DirectionRoom; category: DirectionCategory } | null = null;
  for (const cat of categories) {
    for (const rm of cat.rooms) {
      const rmLower = rm.name.toLowerCase();
      const keywords = rmLower
        .split(/[\s-,&/]+/)
        .filter((w) => w.length > 2 && w !== 'room' && w !== 'floor' && w !== 'the' && w !== 'and');

      const hasExact = normalized.includes(rmLower);
      const hasKeyword = keywords.some((kw) => normalized.includes(kw));
      const isPharmacyMatch = (rm.id.includes('pharmacy') || rmLower.includes('pharmacy')) &&
        (normalized.includes('pharmacy') || normalized.includes('medicine') || normalized.includes('chemist') || normalized.includes('dispensing') || normalized.includes('दवा') || normalized.includes('दवाखाना'));
      const isLabMatch = (rm.id.includes('lab') || rmLower.includes('lab')) &&
        (normalized.includes('lab') || normalized.includes('diagnostic') || normalized.includes('blood') || normalized.includes('test') || normalized.includes('laboratory') || normalized.includes('जाँच') || normalized.includes('लैब'));
      const isRestroomMatch = (rm.id.includes('restroom') || rmLower.includes('restroom') || rmLower.includes('washroom')) &&
        (normalized.includes('restroom') || normalized.includes('washroom') || normalized.includes('toilet') || normalized.includes('bathroom') || normalized.includes('शौचालय') || normalized.includes('वॉशरूम'));
      const isWaterMatch = (rm.id.includes('water') || rmLower.includes('water')) &&
        (normalized.includes('water') || normalized.includes('drinking water') || normalized.includes('पानी'));
      const isBillingMatch = (rm.id.includes('billing') || rmLower.includes('billing')) &&
        (normalized.includes('billing') || normalized.includes('bill desk') || normalized.includes('insurance desk'));

      if (hasExact || hasKeyword || isPharmacyMatch || isLabMatch || isRestroomMatch || isWaterMatch || isBillingMatch) {
        matchedRoom = { room: rm, category: cat };
        break;
      }
    }
    if (matchedRoom) break;
  }

  // Direct keyword fallback matching
  if (!matchedRoom) {
    if (
      normalized.includes('pharmacy') ||
      normalized.includes('medicine') ||
      normalized.includes('chemist') ||
      normalized.includes('दवा')
    ) {
      const pCat = categories.find((c) => c.id === 'cat_pharmacy_labs') || categories[0];
      const pRoom = pCat?.rooms.find((r) => r.id.includes('pharmacy')) || pCat?.rooms[0];
      if (pCat && pRoom) {
        matchedRoom = { room: pRoom, category: pCat };
      }
    }
  }

  if (matchedRoom) {
    return {
      intent: 'directions_room',
      targetUrl: `/reception/directions/${matchedRoom.category.id}/${matchedRoom.room.id}`,
      matchedRoom: matchedRoom.room,
      matchedCategory: matchedRoom.category,
    };
  }

  // Priority 2: Category Match
  const isExplicitDirections = DIRECTIONS_WORDS.some((w) => normalized.includes(w.toLowerCase()));
  let matchedCat: DirectionCategory | null = null;
  for (const cat of categories) {
    const catLower = cat.name.toLowerCase();
    const catKeywords = catLower.split(/[\s&,-]+/).filter((w) => w.length > 2);
    if (
      normalized.includes(catLower) ||
      (isExplicitDirections && catKeywords.some((kw) => normalized.includes(kw))) ||
      (cat.id === 'cat_pharmacy_labs' && (normalized.includes('pharmacy') || normalized.includes('lab') || normalized.includes('diagnostic') || normalized.includes('medicine') || normalized.includes('test'))) ||
      (cat.id === 'cat_facilities' && (normalized.includes('facilities') || normalized.includes('restroom') || normalized.includes('washroom') || normalized.includes('toilet') || normalized.includes('water'))) ||
      (cat.id === 'cat_clinical' && isExplicitDirections && (normalized.includes('clinical') || normalized.includes('consultation') || normalized.includes('doctor') || normalized.includes('opd')))
    ) {
      matchedCat = cat;
      break;
    }
  }

  if (matchedCat) {
    return {
      intent: 'directions_category',
      targetUrl: `/reception/directions/${matchedCat.id}`,
      matchedCategory: matchedCat,
    };
  }

  // Priority 3: General Intents
  const isWalkin = WALKIN_WORDS.some((w) => normalized.includes(w.toLowerCase()));
  const isPayment = !isWalkin && PAYMENT_WORDS.some((w) => normalized.includes(w.toLowerCase()));
  const isAppointment = !isWalkin && !isPayment && APPOINTMENT_WORDS.some((w) => normalized.includes(w.toLowerCase()));

  if (isWalkin) {
    return { intent: 'walk_in', targetUrl: '/reception/walk-in' };
  }
  if (isPayment) {
    return { intent: 'payment', targetUrl: '/reception/billing' };
  }
  if (isAppointment) {
    return { intent: 'appointment', targetUrl: '/reception/appointment' };
  }
  if (isExplicitDirections) {
    return {
      intent: 'directions_all',
      targetUrl: '/reception/directions',
    };
  }

  // Priority 4: Fallback (Stays on /reception AMBIENT screen)
  return {
    intent: 'fallback',
    targetUrl: '/reception',
  };
}

describe('Part B: Two-Stage Voice Intent Resolution & Route Verification', () => {
  let client: MockMaClient;
  let categories: DirectionCategory[];

  beforeEach(async () => {
    MockMaClient.resetStorage();
    client = new MockMaClient();
    categories = await client.getDirectionCategories();
  });

  it('Input 1: "where is the pharmacy" -> lands directly on specific pharmacy room detail route', () => {
    const input = 'where is the pharmacy';
    const result = resolveVoiceIntent(input, categories);
    
    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_pharmacy_labs/station_pharmacy_1');
    expect(result.matchedRoom?.name).toContain('Pharmacy');
    expect(result.matchedCategory?.id).toBe('cat_pharmacy_labs');
  });

  it('Input 1A: "i need the location of pharmacy" -> lands directly on specific pharmacy room detail route', () => {
    const input = 'i need the location of pharmacy';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_pharmacy_labs/station_pharmacy_1');
    expect(result.matchedRoom?.name).toContain('Pharmacy');
    expect(result.matchedCategory?.id).toBe('cat_pharmacy_labs');
  });

  it('Input 1B: "where do I get my lab test" -> lands directly on Diagnostic Lab 1 route', () => {
    const input = 'where do I get my lab test';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_pharmacy_labs/station_lab_1');
    expect(result.matchedRoom?.name).toContain('Diagnostic Lab');
    expect(result.matchedCategory?.id).toBe('cat_pharmacy_labs');
  });

  it('Input 1C: "diagnostic center" -> lands directly on Diagnostic Lab 1 route', () => {
    const input = 'diagnostic center';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_pharmacy_labs/station_lab_1');
    expect(result.matchedRoom?.name).toContain('Diagnostic Lab');
  });

  it('Input 2: "get directions" (no specific place) -> lands on /reception/directions category list', () => {
    const input = 'get directions';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_all');
    expect(result.targetUrl).toBe('/reception/directions');
  });

  it('Input 3: "I have an appointment" -> lands on /reception/appointment', () => {
    const input = 'I have an appointment';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('appointment');
    expect(result.targetUrl).toBe('/reception/appointment');
  });

  it('Input 4: Nonsensical/unrelated speech -> stays on AMBIENT home /reception', () => {
    const input = 'what is the weather in Paris today';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('fallback');
    expect(result.targetUrl).toBe('/reception');
  });

  it('Additional room query: "take me to dr priya" -> lands directly on pediatrics doctor room', () => {
    const input = 'take me to dr priya';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_clinical/st-consult-3');
    expect(result.matchedRoom?.name).toContain('Dr. Priya Nair');
  });

  it('Additional query: "where is the restroom" -> lands directly on restroom room detail', () => {
    const input = 'where is the restroom';
    const result = resolveVoiceIntent(input, categories);

    expect(result.intent).toBe('directions_room');
    expect(result.targetUrl).toBe('/reception/directions/cat_facilities/st-restroom-1');
  });
});
