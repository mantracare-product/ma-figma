/**
 * onboardingHelpers.ts
 * Path: src/app/pages/auth/onboardingHelpers.ts
 *
 * Shared data structures, scraping helpers, and detection logic
 * used by both Voice Onboarding and Quick Form Onboarding.
 */

import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";

export interface UploadedDoc {
  id: string;
  name: string;
  sizeLabel: string;
}

export interface CollectedOnboardingData {
  confirmedCategory: string;
  industry: string;
  requirements: string[];
  callVolume: string | null;
  internationalCalls: boolean | null;
  locations: string[];
  primaryLocation: string | null;
  operatingHours: string | null;
  teamSize: string; // required
  uploadedDocuments: UploadedDoc[];
  telephony: "bring_own" | "default" | null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Smart Practice Detection from Website/Description ──
export function detectPracticeCategory(orgName: string, text: string): {
  category: string;
  playerType: string;
  industry: string;
} {
  const combined = `${orgName} ${text}`.toLowerCase();

  if (/dent|teeth|orthodont|oral|smile|molar|hygiene/.test(combined)) {
    return { category: "Dentist", playerType: "dental care", industry: "Healthcare" };
  }
  if (/cardio|heart|vascular|hypertension/.test(combined)) {
    return { category: "Cardiologist", playerType: "cardiology", industry: "Healthcare" };
  }
  if (/derm|skin|aesthetic|botox|facial|cosmetic/.test(combined)) {
    return { category: "Dermatologist", playerType: "dermatology & skin care", industry: "Healthcare" };
  }
  if (/pediatr|child|infant|toddler|kids|adolescent/.test(combined)) {
    return { category: "Pediatrician", playerType: "pediatric care", industry: "Healthcare" };
  }
  if (/eye|vision|optom|ophthalm|lasik/.test(combined)) {
    return { category: "Ophthalmologist", playerType: "eye & vision care", industry: "Healthcare" };
  }
  if (/ortho|bone|joint|spine|sports med|fracture|knee/.test(combined)) {
    return { category: "Orthopedic", playerType: "orthopedic & joint care", industry: "Healthcare" };
  }
  if (/therapy|counsel|psych|mental|behavioral|adhd|depression/.test(combined)) {
    return { category: "Therapist", playerType: "mental health & counseling", industry: "Healthcare" };
  }
  if (/ent|ear|nose|throat|sinus|audiol/.test(combined)) {
    return { category: "ENT Specialist", playerType: "ear, nose & throat care", industry: "Healthcare" };
  }
  if (/gastro|digest|stomach|colon|liver|endoscop/.test(combined)) {
    return { category: "Gastroenterologist", playerType: "gastroenterology", industry: "Healthcare" };
  }
  if (/fertility|ivf|obgyn|gyn|maternity|prenatal/.test(combined)) {
    return { category: "Gynecologist", playerType: "women's health", industry: "Healthcare" };
  }
  if (/surg|operating|procedure|general surgery/.test(combined)) {
    return { category: "General Surgery", playerType: "surgical care", industry: "Healthcare" };
  }
  if (/oncol|cancer|chemo|tumor/.test(combined)) {
    return { category: "Oncologist", playerType: "oncology care", industry: "Healthcare" };
  }
  if (/chiro|wellness|physio|rehab|physical therapy/.test(combined)) {
    return { category: "Diagnostics", playerType: "rehab & physical wellness", industry: "Healthcare" };
  }

  // Check against non-healthcare categories in INITIAL_CATEGORIES
  for (const cat of INITIAL_CATEGORIES) {
    if (cat.name === "Healthcare") continue;
    const catMatch = new RegExp(cat.name.replace(/[^a-zA-Z0-9]/g, "|"), "i");
    if (catMatch.test(combined)) {
      return {
        category: cat.industries[0] || cat.name,
        playerType: cat.name.toLowerCase(),
        industry: cat.name,
      };
    }
    for (const ind of cat.industries) {
      if (combined.includes(ind.toLowerCase())) {
        return {
          category: ind,
          playerType: ind.toLowerCase(),
          industry: cat.name,
        };
      }
    }
  }

  return { category: "General Physician", playerType: "primary healthcare", industry: "Healthcare" };
}

// ── Smart Location Scraper ──
export function scrapeLocationsFromContext(
  websiteUrl: string,
  description: string,
  country?: string
): string[] {
  const text = `${websiteUrl} ${description}`.toLowerCase();
  const knownPlaces = [
    "Downtown", "Midtown", "West End", "North Branch", "Eastside", "Central",
    "Manhattan", "Brooklyn", "Queens", "New York", "Los Angeles", "Chicago", "Houston",
    "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "San Jose",
    "San Francisco", "Seattle", "Denver", "Boston", "Miami", "Atlanta", "Portland",
    "London", "Manchester", "Birmingham", "Toronto", "Vancouver", "Montreal", "Sydney", "Melbourne",
  ];

  const found: string[] = [];
  for (const place of knownPlaces) {
    if (text.includes(place.toLowerCase())) {
      found.push(place);
    }
  }

  const match = description.match(
    /(?:located in|branches in|clinic in|offices in|facilities in|operating in|locations?:?)\s+([A-Za-z0-9\s,]+?)(?:\.|\n|$)/i
  );
  if (match && match[1]) {
    const rawParts = match[1]
      .split(/,|and|\//)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 28);
    for (const p of rawParts) {
      if (!found.some((f) => f.toLowerCase() === p.toLowerCase())) {
        found.push(p);
      }
    }
  }

  if (found.length === 0) {
    if (country && /kingdom|uk\b/i.test(country)) {
      return ["Central London Clinic", "West End Practice"];
    } else if (country && /canada/i.test(country)) {
      return ["Downtown Toronto", "North York Clinic"];
    } else if (country && /australia/i.test(country)) {
      return ["Sydney CBD Clinic", "North Sydney Branch"];
    } else if (websiteUrl.trim()) {
      return ["Main Clinic", "Downtown Location"];
    }
  }

  return Array.from(new Set(found));
}

// ── Needs Inference ──
export function extractNeedsRequirements(text: string): string[] {
  const lower = text.toLowerCase();
  const reqs: string[] = [];

  // Calls, missed calls, front desk, bookings, scheduling, client contact -> AI Reception
  if (
    /call|phone|reception|front desk|answering|hold|missed|appointment|booking|schedule|inbound|patients calling|contacting clients|reaching out/i.test(
      lower
    )
  ) {
    reqs.push("AI Reception");
  }

  // Notes, charting, documentation -> Scribe
  if (
    /note|scribe|chart|document|transcrib|paperwork|dictat|after hours note|clinical summary|writing notes/i.test(
      lower
    )
  ) {
    reqs.push("Scribe");
  }

  // Records, patient history, intake -> EHR
  if (
    /ehr|emr|medical record|patient history|intake|history|patient charts|records/i.test(
      lower
    )
  ) {
    reqs.push("EHR");
  }

  // Claims, billing, insurance, denials -> RCM
  if (
    /bill|claim|insurance|invoic|payment|denial|reimbursement|rcm|revenue|collecting|claims filed/i.test(
      lower
    )
  ) {
    reqs.push("RCM");
  }

  return reqs;
}

export function cleanTeamSize(val: string): string {
  const trimmed = val.trim();
  return trimmed
    .replace(/^a\s+team\s+of\s+/i, "")
    .replace(/^team\s+of\s+/i, "")
    .replace(/staff$/i, "")
    .trim();
}
