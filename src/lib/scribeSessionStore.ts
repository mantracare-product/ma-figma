import { StoredClientDocument, saveClientDocument } from "./clientDocumentsStore";
import { appendActivity } from "./activityEngine";

export const SCRIBE_EVENT = "scribe-store-updated";

export interface ScribeUtterance {
  id: string;
  speaker: "doctor" | "patient" | "assistant";
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

export interface ExtractedMedication {
  id: string;
  drugName: string;
  name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  confidence: number;
}

export interface ExtractedClinicalData {
  chiefComplaint: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: string;
    temperature?: string;
    weight?: string;
    spo2?: string;
    heartRate?: string;
  };
  diagnosis: string;
  icd10Code?: string;
  secondaryDiagnosis?: string[];
  medications: ExtractedMedication[];
  investigations: string[];
  advice?: string[];
  followUpDate?: string;
  followUpDays?: number;
  dietaryAdvice?: string;
  doctorNotes?: string;
}

export interface QueuePatient {
  id: string;
  clientId: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  appointmentTime: string;
  chiefComplaint: string;
  status: "Waiting" | "In Consultation" | "Completed";
  allergies?: string[];
  history?: string[];
  scenarioId?: string;
}

export interface ScribeSession {
  id: string;
  clientId: string;
  clientName: string;
  patientAge?: number;
  patientGender?: string;
  appointmentId?: string;
  sessionName?: string;
  dealId?: string;
  doctorId: string;
  doctorName: string;
  sessionDate: string;
  durationSeconds: number;
  audioBlobUrl?: string;
  transcript: {
    fullText: string;
    utterances: ScribeUtterance[];
  };
  extractedData: ExtractedClinicalData;
  generatedDocumentId?: string;
  status: "recording" | "transcribed" | "extracted" | "completed" | "discarded";
  createdAt: number;
}

export interface PresetScenario {
  id: string;
  title: string;
  patientName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  allergies?: string[];
  history?: string[];
  chiefComplaint: string;
  transcriptText: string;
  utterances: ScribeUtterance[];
  extractedData: ExtractedClinicalData;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "cataract-review",
    title: "Ophthalmology — Nuclear Cataract Grade II",
    patientName: "Rajesh Kumar",
    age: 54,
    gender: "Male" as const,
    phone: "+91 98765 43210",
    allergies: ["Penicillin"],
    history: ["Type 2 Diabetes (6 yrs)", "Hypertension"],
    chiefComplaint: "Progressive blurriness and glare while driving at night for 3 months.",
    transcriptText: `[00:00] Doctor: Good morning, Mr. Rajesh. Please have a seat. How have your eyes been feeling since we last checked?
[00:08] Patient: Good morning doctor. The glare has gotten worse, especially at night when driving. The right eye feels cloudy.
[00:18] Doctor: Let me look at your slit-lamp examination. Right eye shows Grade II nuclear sclerosis. Left eye is mild Grade I. Intraocular pressure is 15 mmHg in both eyes, which is normal.
[00:32] Patient: Is surgery needed right away, doctor?
[00:36] Doctor: It is mature enough that Phacoemulsification cataract extraction with Monofocal or Toric IOL is advised for your right eye. For now, let us start lubricating drops and prepare pre-op work.
[00:49] Doctor: I am prescribing Moxifloxacin 0.5% eye drops — 1 drop four times daily in the right eye, and Refresh Tears lubricant 3 times a day. We will also schedule a B-Scan and A-Scan Biometry.
[01:05] Patient: Understood, doctor. When should I follow up?
[01:09] Doctor: Come back in 7 days on September 2nd with your fasting blood sugar and biometry reports.`,
    utterances: [
      { id: "u1", speaker: "doctor", startTime: 0, endTime: 7, text: "Good morning, Mr. Rajesh. Please have a seat. How have your eyes been feeling since we last checked?", confidence: 0.98 },
      { id: "u2", speaker: "patient", startTime: 8, endTime: 17, text: "Good morning doctor. The glare has gotten worse, especially at night when driving. The right eye feels cloudy.", confidence: 0.95 },
      { id: "u3", speaker: "doctor", startTime: 18, endTime: 31, text: "Let me look at your slit-lamp examination. Right eye shows Grade II nuclear sclerosis. Left eye is mild Grade I. Intraocular pressure is 15 mmHg in both eyes, which is normal.", confidence: 0.97 },
      { id: "u4", speaker: "patient", startTime: 32, endTime: 35, text: "Is surgery needed right away, doctor?", confidence: 0.96 },
      { id: "u5", speaker: "doctor", startTime: 36, endTime: 48, text: "It is mature enough that Phacoemulsification cataract extraction with Monofocal or Toric IOL is advised for your right eye. For now, let us start lubricating drops and prepare pre-op work.", confidence: 0.96 },
      { id: "u6", speaker: "doctor", startTime: 49, endTime: 64, text: "I am prescribing Moxifloxacin 0.5% eye drops — 1 drop four times daily in the right eye, and Refresh Tears lubricant 3 times a day. We will also schedule a B-Scan and A-Scan Biometry.", confidence: 0.99 },
      { id: "u7", speaker: "patient", startTime: 65, endTime: 68, text: "Understood, doctor. When should I follow up?", confidence: 0.98 },
      { id: "u8", speaker: "doctor", startTime: 69, endTime: 76, text: "Come back in 7 days on September 2nd with your fasting blood sugar and biometry reports.", confidence: 0.97 },
    ],
    extractedData: {
      chiefComplaint: "Blurry vision in right eye with night glare for 3 months",
      vitals: {
        bloodPressure: "128/82 mmHg",
        pulse: "74 bpm",
        spo2: "99%",
      },
      diagnosis: "Nuclear Cataract Grade II (Right Eye)",
      secondaryDiagnosis: ["Early Senile Cataract Grade I (Left Eye)", "Type 2 Diabetes Mellitus"],
      medications: [
        { id: "m1", drugName: "Moxifloxacin Eye Drops 0.5%", dosage: "1 drop", frequency: "4 times daily (QID)", duration: "7 days", instructions: "Right eye only", confidence: 0.98 },
        { id: "m2", drugName: "Carboxymethylcellulose (Refresh Tears) 0.5%", dosage: "1 drop", frequency: "3 times daily (TDS)", duration: "30 days", instructions: "Both eyes as lubricant", confidence: 0.96 },
      ],
      investigations: ["A-Scan & B-Scan Biometry (Right Eye)", "Fasting Blood Sugar & HbA1c", "ECG Pre-Op Clearance"],
      followUpDate: "2026-09-02",
      doctorNotes: "Advised Phacoemulsification with Toric Monofocal IOL implantation. Blood sugar clearance required.",
    }
  },
  {
    id: "general-consult",
    title: "Internal Medicine — Acute Bronchitis & Hypertension",
    patientName: "Sunita Devi",
    age: 48,
    gender: "Female" as const,
    phone: "+91 98111 22334",
    allergies: ["Sulfa Drugs"],
    history: ["Hypertension (3 yrs)"],
    chiefComplaint: "Productive cough, mild fever, and shortness of breath for 5 days.",
    transcriptText: `[00:00] Doctor: Hello Mrs. Sunita, tell me what has been troubling you.
[00:06] Patient: Doctor, I've had a bad chest cough with yellow phlegm for five days, and a slight fever of 100°F.
[00:15] Doctor: Let me listen to your lungs. Deep breath in... yes, bilateral coarse crepitations in lower lung zones. Throat is mildly congested. Blood pressure is slightly high today at 140/90.
[00:30] Patient: Do I have an infection?
[00:33] Doctor: Yes, it is Acute Bronchitis. We will start an antibiotic course of Azithromycin 500mg once daily for 5 days, Paracetamol 650mg for fever as needed, and an Ambroxol cough syrup.
[00:48] Doctor: Also continue your regular Telmisartan 40mg for BP in the morning. Please avoid cold water.
[00:56] Patient: Sure doctor. Should I do a chest X-Ray?
[01:00] Doctor: Let us do a Digital Chest X-Ray PA view and Complete Blood Count (CBC). Follow up in 5 days on August 29th.`,
    utterances: [
      { id: "u1", speaker: "doctor", startTime: 0, endTime: 5, text: "Hello Mrs. Sunita, tell me what has been troubling you.", confidence: 0.98 },
      { id: "u2", speaker: "patient", startTime: 6, endTime: 14, text: "Doctor, I've had a bad chest cough with yellow phlegm for five days, and a slight fever of 100°F.", confidence: 0.96 },
      { id: "u3", speaker: "doctor", startTime: 15, endTime: 29, text: "Let me listen to your lungs. Deep breath in... yes, bilateral coarse crepitations in lower lung zones. Throat is mildly congested. Blood pressure is slightly high today at 140/90.", confidence: 0.97 },
      { id: "u4", speaker: "patient", startTime: 30, endTime: 32, text: "Do I have an infection?", confidence: 0.98 },
      { id: "u5", speaker: "doctor", startTime: 33, endTime: 47, text: "Yes, it is Acute Bronchitis. We will start an antibiotic course of Azithromycin 500mg once daily for 5 days, Paracetamol 650mg for fever as needed, and an Ambroxol cough syrup.", confidence: 0.98 },
      { id: "u6", speaker: "doctor", startTime: 48, endTime: 55, text: "Also continue your regular Telmisartan 40mg for BP in the morning. Please avoid cold water.", confidence: 0.97 },
      { id: "u7", speaker: "patient", startTime: 56, endTime: 59, text: "Sure doctor. Should I do a chest X-Ray?", confidence: 0.98 },
      { id: "u8", speaker: "doctor", startTime: 60, endTime: 68, text: "Let us do a Digital Chest X-Ray PA view and Complete Blood Count (CBC). Follow up in 5 days on August 29th.", confidence: 0.99 },
    ],
    extractedData: {
      chiefComplaint: "Productive cough with yellow sputum, low-grade fever (100°F) for 5 days",
      vitals: {
        bloodPressure: "140/90 mmHg",
        pulse: "82 bpm",
        temperature: "100.2 °F",
        spo2: "97%",
      },
      diagnosis: "Acute Bronchitis with Bronchospasm",
      secondaryDiagnosis: ["Essential Hypertension - Stage 1"],
      medications: [
        { id: "m1", drugName: "Tab Azithromycin 500 mg", dosage: "1 tablet", frequency: "Once daily (OD)", duration: "5 days", instructions: "1 hour before meals", confidence: 0.99 },
        { id: "m2", drugName: "Tab Paracetamol 650 mg (Dolo)", dosage: "1 tablet", frequency: "SOS / Twice daily", duration: "3 days", instructions: "After food if fever > 99.5°F", confidence: 0.97 },
        { id: "m3", drugName: "Syp Ambroxol + Levosalbutamol + Guaiphenesin (100ml)", dosage: "10 ml", frequency: "3 times daily (TDS)", duration: "5 days", instructions: "After food with warm water", confidence: 0.95 },
        { id: "m4", drugName: "Tab Telmisartan 40 mg", dosage: "1 tablet", frequency: "Once daily (OD Morning)", duration: "30 days", instructions: "Regular BP medication", confidence: 0.98 },
      ],
      investigations: ["Digital Chest X-Ray (PA View)", "Complete Blood Count (CBC) with ESR", "Serum Creatinine"],
      followUpDate: "2026-08-29",
      doctorNotes: "Steam inhalation twice daily. Avoid refrigerated beverages. Report immediately if dyspnea worsens.",
    }
  },
  {
    id: "ortho-review",
    title: "Orthopedics — Osteoarthritis Knee Grade III",
    patientName: "Amit Patel",
    age: 62,
    gender: "Male" as const,
    phone: "+91 97234 56789",
    allergies: ["None"],
    history: ["No major systemic history"],
    chiefComplaint: "Severe bilateral knee pain, difficulty walking and climbing stairs for 6 months.",
    transcriptText: `[00:00] Doctor: Namaste Mr. Amit. Tell me how the knee pain has been.
[00:07] Patient: Doctor, pain in both knees has become very bad. I cannot walk more than 100 meters or climb stairs without sharp pain.
[00:17] Doctor: Examining both knees. Significant crepitus in bilateral patellofemoral joints. Medial joint line tenderness present. Range of motion is restricted to 105 degrees.
[00:30] Doctor: X-Ray AP/Lateral standing view shows Grade III Osteoarthritis with severe joint space narrowing in the medial compartment.
[00:41] Doctor: We will start an anti-inflammatory course of Aceclofenac + Paracetamol twice daily for 5 days with a proton-pump inhibitor, plus Glucosamine & Collagen peptide supplements.
[00:54] Doctor: We also advise Quadriceps isometric physiotherapy and bilateral knee unloader braces. Consider PRP or Total Knee Replacement if pain persists.
[01:06] Patient: Thank you doctor. When should I review?
[01:10] Doctor: Review in 14 days on September 7th after completing physiotherapy sessions.`,
    utterances: [
      { id: "u1", speaker: "doctor", startTime: 0, endTime: 6, text: "Namaste Mr. Amit. Tell me how the knee pain has been.", confidence: 0.98 },
      { id: "u2", speaker: "patient", startTime: 7, endTime: 16, text: "Doctor, pain in both knees has become very bad. I cannot walk more than 100 meters or climb stairs without sharp pain.", confidence: 0.97 },
      { id: "u3", speaker: "doctor", startTime: 17, endTime: 29, text: "Examining both knees. Significant crepitus in bilateral patellofemoral joints. Medial joint line tenderness present. Range of motion is restricted to 105 degrees.", confidence: 0.98 },
      { id: "u4", speaker: "doctor", startTime: 30, endTime: 40, text: "X-Ray AP/Lateral standing view shows Grade III Osteoarthritis with severe joint space narrowing in the medial compartment.", confidence: 0.96 },
      { id: "u5", speaker: "doctor", startTime: 41, endTime: 53, text: "We will start an anti-inflammatory course of Aceclofenac + Paracetamol twice daily for 5 days with a proton-pump inhibitor, plus Glucosamine & Collagen peptide supplements.", confidence: 0.97 },
      { id: "u6", speaker: "doctor", startTime: 54, endTime: 65, text: "We also advise Quadriceps isometric physiotherapy and bilateral knee unloader braces. Consider PRP or Total Knee Replacement if pain persists.", confidence: 0.95 },
      { id: "u7", speaker: "patient", startTime: 66, endTime: 69, text: "Thank you doctor. When should I review?", confidence: 0.98 },
      { id: "u8", speaker: "doctor", startTime: 70, endTime: 76, text: "Review in 14 days on September 7th after completing physiotherapy sessions.", confidence: 0.97 },
    ],
    extractedData: {
      chiefComplaint: "Bilateral knee pain, morning stiffness, difficulty climbing stairs for 6 months",
      vitals: {
        bloodPressure: "132/84 mmHg",
        pulse: "76 bpm",
        weight: "78 kg",
      },
      diagnosis: "Bilateral Osteoarthritis Knee — Grade III (Kellgren-Lawrence)",
      secondaryDiagnosis: ["Patellofemoral Joint Arthritis"],
      medications: [
        { id: "m1", drugName: "Tab Aceclofenac 100mg + Paracetamol 325mg (Zerodol-P)", dosage: "1 tablet", frequency: "Twice daily (BD)", duration: "5 days", instructions: "Strictly after meals", confidence: 0.98 },
        { id: "m2", drugName: "Cap Pantoprazole 40mg (Pan-40)", dosage: "1 capsule", frequency: "Once daily (OD Morning)", duration: "5 days", instructions: "Empty stomach 30 mins before breakfast", confidence: 0.99 },
        { id: "m3", drugName: "Sachet Collagen Peptide + Glucosamine + Rosehip (JointCare)", dosage: "1 sachet in water", frequency: "Once daily (OD)", duration: "30 days", instructions: "Post lunch daily", confidence: 0.95 },
      ],
      investigations: ["Digital Standing Weight-Bearing X-Ray Both Knees (AP / Lateral)", "Serum Uric Acid", "RA Factor & Anti-CCP"],
      followUpDate: "2026-09-07",
      doctorNotes: "Referred to Physiotherapy for VMO strengthening. Avoid squatting and cross-legged sitting.",
    }
  }
];

const INITIAL_QUEUE: QueuePatient[] = [
  {
    id: "q-1",
    clientId: "CL-001",
    name: "Sarah Johnson",
    age: 34,
    gender: "Female",
    phone: "5551234567",
    appointmentTime: "10:00 AM",
    chiefComplaint: "Blurry vision & night glare (Right eye)",
    status: "Waiting",
    allergies: ["Penicillin"],
    history: ["Type 2 Diabetes (6 yrs)", "Hypertension"],
    scenarioId: "cataract-review"
  },
  {
    id: "q-2",
    clientId: "CL-002",
    name: "Michael Chen",
    age: 42,
    gender: "Male",
    phone: "5552345678",
    appointmentTime: "10:30 AM",
    chiefComplaint: "Productive cough and mild fever (5 days)",
    status: "Waiting",
    allergies: ["Sulfa Drugs"],
    history: ["Hypertension (3 yrs)"],
    scenarioId: "general-consult"
  },
  {
    id: "q-3",
    clientId: "CL-003",
    name: "Emily Davis",
    age: 38,
    gender: "Female",
    phone: "5553456789",
    appointmentTime: "11:00 AM",
    chiefComplaint: "Bilateral knee joint pain & stiffness",
    status: "Waiting",
    allergies: ["None"],
    history: ["No major chronic history"],
    scenarioId: "ortho-review"
  },
  {
    id: "q-4",
    clientId: "CL-004",
    name: "Robert Wilson",
    age: 45,
    gender: "Male",
    phone: "5554567890",
    appointmentTime: "11:30 AM",
    chiefComplaint: "Routine Post-Lasik 1-month checkup",
    status: "Waiting",
    allergies: ["None"],
    history: ["Lasik done on 24 Jul 2026"],
    scenarioId: "cataract-review"
  },
];

export interface ScribeDoctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  room: string;
  avatarBg: string;
  regNumber: string;
  consultationsToday: number;
  avgDurationSec: number;
  confidenceScore: number;
  status: "Active" | "In Consultation" | "Break";
}

export const SCRIBE_DOCTORS: ScribeDoctor[] = [
  {
    id: "doc-1",
    name: "Dr. Priya Sharma",
    specialty: "Ophthalmology & Cornea",
    department: "Ophthalmology",
    room: "Room #3 (OPD Wing A)",
    avatarBg: "bg-blue-600",
    regNumber: "MC-89421",
    consultationsToday: 14,
    avgDurationSec: 84,
    confidenceScore: 98.6,
    status: "In Consultation",
  },
  {
    id: "doc-2",
    name: "Dr. Rohan Mehta",
    specialty: "Orthopaedics & Joint Replacement",
    department: "Orthopaedics",
    room: "Room #7 (OPD Wing B)",
    avatarBg: "bg-emerald-600",
    regNumber: "MC-74192",
    consultationsToday: 11,
    avgDurationSec: 92,
    confidenceScore: 97.9,
    status: "Active",
  },
  {
    id: "doc-3",
    name: "Dr. Ananya Sen",
    specialty: "General & Internal Medicine",
    department: "Internal Medicine",
    room: "Room #2 (OPD Wing A)",
    avatarBg: "bg-purple-600",
    regNumber: "MC-61023",
    consultationsToday: 18,
    avgDurationSec: 72,
    confidenceScore: 99.1,
    status: "Active",
  },
  {
    id: "doc-4",
    name: "Dr. Vikram Malhotra",
    specialty: "Cardiology & Preventive Care",
    department: "Cardiology",
    room: "Room #5 (Cardiac Suite)",
    avatarBg: "bg-amber-600",
    regNumber: "MC-50933",
    consultationsToday: 9,
    avgDurationSec: 110,
    confidenceScore: 98.2,
    status: "Break",
  },
];

export interface ScribeSettings {
  sttEngine: "deepgram-nova-2-medical" | "whisper-large-v3" | "google-medical-v2";
  confidenceThreshold: number;
  autoWhatsAppDelivery: boolean;
  autoSyncCustomFields: boolean;
  retentionDays: number;
  diarizationMode: "doctor-patient" | "multi-speaker" | "raw";
  ambientNoiseFilter: boolean;
}

export const DEFAULT_SCRIBE_SETTINGS: ScribeSettings = {
  sttEngine: "deepgram-nova-2-medical",
  confidenceThreshold: 90,
  autoWhatsAppDelivery: true,
  autoSyncCustomFields: true,
  retentionDays: 90,
  diarizationMode: "doctor-patient",
  ambientNoiseFilter: true,
};

export const INITIAL_SCRIBE_SESSIONS: ScribeSession[] = [
  {
    id: "scribe-101",
    clientId: "CL-001",
    clientName: "Sarah Johnson",
    patientAge: 34,
    patientGender: "Female",
    appointmentId: "apt-101",
    sessionName: "Session #1 (Cataract & Vision)",
    doctorId: "doc-1",
    doctorName: "Dr. Priya Sharma",
    sessionDate: "2026-08-24T10:45:00.000Z",
    durationSeconds: 76,
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 120,
    transcript: {
      fullText: PRESET_SCENARIOS[0].transcriptText,
      utterances: PRESET_SCENARIOS[0].utterances,
    },
    extractedData: PRESET_SCENARIOS[0].extractedData,
  },
  {
    id: "scribe-102",
    clientId: "CL-002",
    clientName: "Michael Chen",
    patientAge: 42,
    patientGender: "Male",
    appointmentId: "apt-102",
    sessionName: "Session #2 (Bronchitis & Medicine)",
    doctorId: "doc-3",
    doctorName: "Dr. Ananya Sen",
    sessionDate: "2026-08-24T09:30:00.000Z",
    durationSeconds: 68,
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 240,
    transcript: {
      fullText: PRESET_SCENARIOS[1].transcriptText,
      utterances: PRESET_SCENARIOS[1].utterances,
    },
    extractedData: PRESET_SCENARIOS[1].extractedData,
  },
  {
    id: "scribe-103",
    clientId: "CL-003",
    clientName: "Emily Davis",
    patientAge: 38,
    patientGender: "Female",
    appointmentId: "apt-103",
    sessionName: "Session #3 (Orthopedics Knee)",
    doctorId: "doc-2",
    doctorName: "Dr. Rohan Mehta",
    sessionDate: "2026-08-23T16:15:00.000Z",
    durationSeconds: 94,
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    transcript: {
      fullText: PRESET_SCENARIOS[2].transcriptText,
      utterances: PRESET_SCENARIOS[2].utterances,
    },
    extractedData: PRESET_SCENARIOS[2].extractedData,
  },
  {
    id: "scribe-104",
    clientId: "CL-004",
    clientName: "Robert Wilson",
    patientAge: 45,
    patientGender: "Male",
    appointmentId: "apt-104",
    sessionName: "Session #4 (Post-Lasik Review)",
    doctorId: "doc-1",
    doctorName: "Dr. Priya Sharma",
    sessionDate: "2026-08-23T14:00:00.000Z",
    durationSeconds: 82,
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    transcript: {
      fullText: `[00:00] Doctor: Hello Robert, how are your eyes 1 month post-LASIK?
[00:06] Patient: Doctor, vision is very crisp 6/6, but I experience mild dryness in the evenings after computer work.
[00:15] Doctor: Cornea flap is completely clear and well-settled. Tear breakup time is 8 seconds. We will switch to preservative-free Sodium Hyaluronate 0.18% lubricant drops 4 times daily for 2 months.
[00:29] Patient: Any screen restrictions?
[00:32] Doctor: Follow the 20-20-20 rule. Next routine check in 3 months on November 24th.`,
      utterances: [
        { id: "u1", speaker: "doctor", startTime: 0, endTime: 5, text: "Hello Robert, how are your eyes 1 month post-LASIK?", confidence: 0.99 },
        { id: "u2", speaker: "patient", startTime: 6, endTime: 14, text: "Doctor, vision is very crisp 6/6, but I experience mild dryness in the evenings after computer work.", confidence: 0.98 },
        { id: "u3", speaker: "doctor", startTime: 15, endTime: 28, text: "Cornea flap is completely clear and well-settled. Tear breakup time is 8 seconds. We will switch to preservative-free Sodium Hyaluronate 0.18% lubricant drops 4 times daily for 2 months.", confidence: 0.98 },
        { id: "u4", speaker: "patient", startTime: 29, endTime: 31, text: "Any screen restrictions?", confidence: 0.99 },
        { id: "u5", speaker: "doctor", startTime: 32, endTime: 40, text: "Follow the 20-20-20 rule. Next routine check in 3 months on November 24th.", confidence: 0.98 },
      ],
    },
    extractedData: {
      chiefComplaint: "Post-LASIK 1-month checkup, mild evening ocular dryness with VDT use",
      vitals: {
        bloodPressure: "118/76 mmHg",
        pulse: "72 bpm",
        spo2: "100%",
      },
      diagnosis: "Post-Refractive LASIK (1-Month Stable) with Mild Evaporative Dry Eye",
      secondaryDiagnosis: ["Computer Vision Syndrome"],
      medications: [
        { id: "m1", drugName: "Sodium Hyaluronate 0.18% Preservative-Free Drops (Hylab)", dosage: "1 drop", frequency: "4 times daily (QID)", duration: "60 days", instructions: "Both eyes", confidence: 0.98 },
      ],
      investigations: ["Slit-lamp Corneal Flap Assessment", "Schirmer Test & TBUT"],
      followUpDate: "2026-11-24",
      doctorNotes: "Vision 6/6 OU uncorrected. Advised 20-20-20 screen rule and blue-cut glasses.",
    },
  },
  {
    id: "scribe-105",
    clientId: "CL-005",
    clientName: "Jessica Brown",
    patientAge: 39,
    patientGender: "Female",
    doctorId: "doc-4",
    doctorName: "Dr. Vikram Malhotra",
    sessionDate: "2026-08-22T11:20:00.000Z",
    durationSeconds: 105,
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    transcript: {
      fullText: `[00:00] Doctor: Good morning Jessica. How has your blood pressure been logging at home?
[00:07] Patient: Doctor, morning readings average around 138 over 88. No palpitations or chest discomfort.
[00:16] Doctor: Cardiovascular exam: S1 S2 heard, no murmurs. Lungs clear. ECG shows normal sinus rhythm without ischemic changes. We will maintain Telmisartan 40mg + Amlodipine 5mg combination.
[00:32] Patient: Should I continue salt restriction?
[00:35] Doctor: Yes, strict DASH diet with < 2.5g sodium per day and 30 minutes brisk walking. Next lipid profile and serum potassium in 3 months.`,
      utterances: [
        { id: "u1", speaker: "doctor", startTime: 0, endTime: 6, text: "Good morning Jessica. How has your blood pressure been logging at home?", confidence: 0.99 },
        { id: "u2", speaker: "patient", startTime: 7, endTime: 15, text: "Doctor, morning readings average around 138 over 88. No palpitations or chest discomfort.", confidence: 0.97 },
        { id: "u3", speaker: "doctor", startTime: 16, endTime: 31, text: "Cardiovascular exam: S1 S2 heard, no murmurs. Lungs clear. ECG shows normal sinus rhythm without ischemic changes. We will maintain Telmisartan 40mg + Amlodipine 5mg combination.", confidence: 0.98 },
        { id: "u4", speaker: "patient", startTime: 32, endTime: 34, text: "Should I continue salt restriction?", confidence: 0.99 },
        { id: "u5", speaker: "doctor", startTime: 35, endTime: 45, text: "Yes, strict DASH diet with < 2.5g sodium per day and 30 minutes brisk walking. Next lipid profile and serum potassium in 3 months.", confidence: 0.98 },
      ],
    },
    extractedData: {
      chiefComplaint: "Routine hypertension 3-month review. No chest pain or dizziness.",
      vitals: {
        bloodPressure: "136/86 mmHg",
        pulse: "70 bpm",
        weight: "64 kg",
        spo2: "99%",
      },
      diagnosis: "Essential Hypertension (Stage 1, Well Controlled)",
      secondaryDiagnosis: ["Dyslipidemia (Mild)"],
      medications: [
        { id: "m1", drugName: "Tab Telmisartan 40mg + Amlodipine 5mg (Telma-AM)", dosage: "1 tablet", frequency: "Once daily (OD Morning)", duration: "90 days", instructions: "After breakfast", confidence: 0.99 },
        { id: "m2", drugName: "Tab Rosuvastatin 10mg", dosage: "1 tablet", frequency: "Once daily (HS Bedtime)", duration: "90 days", instructions: "At night", confidence: 0.98 },
      ],
      investigations: ["Fasting Lipid Profile", "Serum Electrolytes (Na+, K+)", "Serum Creatinine", "12-Lead Resting ECG"],
      followUpDate: "2026-11-20",
      doctorNotes: "BP controlled on dual therapy. Advised low sodium DASH diet and 150 mins weekly aerobic activity.",
    },
  },
];

export function getScribeQueue(): QueuePatient[] {
  try {
    const raw = sessionStorage.getItem("scribePatientQueue");
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_QUEUE;
}

export function saveScribeQueue(queue: QueuePatient[]): void {
  sessionStorage.setItem("scribePatientQueue", JSON.stringify(queue));
  window.dispatchEvent(new Event(SCRIBE_EVENT));
}

export function updateQueuePatientStatus(patientId: string, status: "Waiting" | "In Consultation" | "Completed"): void {
  const current = getScribeQueue();
  const updated = current.map(p => p.id === patientId ? { ...p, status } : p);
  saveScribeQueue(updated);
}

export function getScribeSessions(clientId?: string, doctorId?: string): ScribeSession[] {
  try {
    const raw = sessionStorage.getItem("scribeSessionsData");
    const all: ScribeSession[] = raw ? JSON.parse(raw) : INITIAL_SCRIBE_SESSIONS;
    let filtered = all;
    if (clientId) {
      filtered = filtered.filter(s => s.clientId === clientId);
    }
    if (doctorId && doctorId !== "all") {
      filtered = filtered.filter(s => s.doctorId === doctorId);
    }
    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return INITIAL_SCRIBE_SESSIONS;
  }
}

export function getScribeSessionById(id: string): ScribeSession | undefined {
  const all = getScribeSessions();
  return all.find(s => s.id === id);
}

export function saveScribeSession(session: ScribeSession): void {
  const current = getScribeSessions();
  const filtered = current.filter(s => s.id !== session.id);
  const updated = [session, ...filtered];
  sessionStorage.setItem("scribeSessionsData", JSON.stringify(updated));
  
  // Sync to Activity Timeline
  appendActivity({
    clientId: session.clientId,
    type: "note",
    createdBy: "ai",
    sourceStepName: "AI Scribe",
    details: {
      primary: `🎙 AI Scribe Consultation Completed — ${session.doctorName || "Dr. Priya Sharma"}`,
      secondary: `Diagnosis: ${session.extractedData.diagnosis}. Prescribed ${session.extractedData.medications.length} medications. Consultation duration: ${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s.`,
    },
  });

  // Automatically update Queue status
  const queue = getScribeQueue();
  const matched = queue.find(q => q.clientId === session.clientId || q.name.toLowerCase() === session.clientName.toLowerCase());
  if (matched) {
    updateQueuePatientStatus(matched.id, "Completed");
  }

  window.dispatchEvent(new Event(SCRIBE_EVENT));
}

export function deleteScribeSession(sessionId: string): void {
  const current = getScribeSessions();
  const updated = current.filter(s => s.id !== sessionId);
  sessionStorage.setItem("scribeSessionsData", JSON.stringify(updated));
  window.dispatchEvent(new Event(SCRIBE_EVENT));
}

export function getScribeSettings(): ScribeSettings {
  try {
    const raw = sessionStorage.getItem("scribeSettings");
    if (raw) return { ...DEFAULT_SCRIBE_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SCRIBE_SETTINGS;
}

export function saveScribeSettings(settings: ScribeSettings): void {
  sessionStorage.setItem("scribeSettings", JSON.stringify(settings));
  window.dispatchEvent(new Event(SCRIBE_EVENT));
}

export function getScribeAnalytics() {
  const sessions = getScribeSessions();
  const totalSessions = sessions.length;
  const totalDurationSec = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const avgDurationSec = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions) : 0;
  
  // Benchmark saving: 8 mins baseline typing per consult vs actual audio duration
  const estimatedTypingMinutes = totalSessions * 8.5;
  const actualConsultMinutes = Math.round(totalDurationSec / 60);
  const timeSavedMinutes = Math.max(0, Math.round(estimatedTypingMinutes - actualConsultMinutes));

  const avgConfidence = 98.4;
  const prescriptionsIssued = totalSessions;

  return {
    totalSessions,
    totalDurationSec,
    avgDurationSec,
    timeSavedMinutes,
    avgConfidence,
    prescriptionsIssued,
    doctorsCount: SCRIBE_DOCTORS.length,
  };
}

export function issuePrescriptionDocument(session: ScribeSession): StoredClientDocument {
  const docId = `rx-scribe-${Date.now()}`;
  const medsList = session.extractedData.medications.map((m, idx) => 
    `${idx + 1}. ${m.drugName} — ${m.dosage} | ${m.frequency} for ${m.duration} (${m.instructions})`
  ).join("\n");

  const investigationsList = session.extractedData.investigations.length > 0 
    ? session.extractedData.investigations.map((i, idx) => `${idx + 1}. ${i}`).join("\n") 
    : "None required";

  const prescriptionContent = `===============================================================
                     MANTRACARE CLINICAL SERVICES
              Prescription & Medical Consultation Summary
===============================================================
Doctor: ${session.doctorName || "Dr. Priya Sharma"}, MS, FICO (Reg: MC-89421)
Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
---------------------------------------------------------------
PATIENT DETAILS:
Name: ${session.clientName}
Age/Gender: ${session.patientAge || "54"} yrs / ${session.patientGender || "Male"}
Patient ID: MRN-${session.clientId.padStart(5, "0")}
---------------------------------------------------------------
CHIEF COMPLAINT:
${session.extractedData.chiefComplaint}

CLINICAL DIAGNOSIS:
• Primary: ${session.extractedData.diagnosis}
${session.extractedData.secondaryDiagnosis ? session.extractedData.secondaryDiagnosis.map(d => `• Secondary: ${d}`).join("\n") : ""}

${session.extractedData.vitals ? `VITALS:
BP: ${session.extractedData.vitals.bloodPressure || "N/A"} | Pulse: ${session.extractedData.vitals.pulse || "N/A"} | SpO2: ${session.extractedData.vitals.spo2 || "N/A"} | Wt: ${session.extractedData.vitals.weight || "N/A"}` : ""}
---------------------------------------------------------------
Rx - PRESCRIBED MEDICATIONS:
${medsList}
---------------------------------------------------------------
INVESTIGATIONS & TESTS ORDERED:
${investigationsList}
---------------------------------------------------------------
DOCTOR'S CLINICAL ADVICE & NOTES:
${session.extractedData.doctorNotes || "Follow medication schedule as directed. Report if symptoms worsen."}

NEXT FOLLOW-UP DATE: ${session.extractedData.followUpDate || "In 7 days"}
---------------------------------------------------------------
Digitally Verified & Generated by MantraAssist AI Scribe Engine
===============================================================`;

  const newDoc: StoredClientDocument = {
    id: docId,
    clientId: session.clientId,
    name: `Rx — ${session.extractedData.diagnosis.substring(0, 30)} (${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })})`,
    category: "Medical / Intake",
    fileType: "pdf",
    fileSize: "142 KB",
    uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
    uploadedBy: `${session.doctorName || "Dr. Priya Sharma"} (AI Scribe)`,
    status: "Verified",
    notes: `Generated via AI Scribe ambient consultation. Duration: ${session.durationSeconds}s.`,
    generatedContent: prescriptionContent,
  };

  saveClientDocument(newDoc);
  return newDoc;
}
