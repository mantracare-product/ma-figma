import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Send,
  ArrowRight,
  Sparkles,
  AlertCircle,
  X,
  Building2,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  MapPin,
  Clock,
  Users,
  PhoneCall,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedAvatar, AvatarState } from "../../../reception/avatar/components/AnimatedAvatar";
import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";
import {
  getStoredProcesses,
  saveStoredProcesses,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";
import { WhisperAudioRecorder } from "../../../reception/lib/whisperRecorder";
import logo from "@/imports/ma_logo-1.png";

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

export interface VoiceOnboardingProps {
  orgName: string;
  country?: string;
  mode: "website" | "description";
  websiteUrl: string;
  description: string;
  userEmail?: string;
  onComplete: (data: CollectedOnboardingData) => void;
  onSwitchToTyping: () => void;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  visibleChars?: number;
}

interface OnboardingRecord {
  // Step 1: Welcome & Service
  categoryConfirmed: boolean;
  category: string;
  playerType: string;
  industry: string;

  // Step 2: Needs
  requirements: string[];
  needsFollowupCount: number;

  // Step 2a: Call Details (only if AI Reception selected)
  callVolume: string | null;
  internationalCalls: boolean | null;

  // Step 3: Locations & Operating Hours
  locations: string[];
  primaryLocation: string | null;
  operatingHours: string | null;

  // Step 4: Team Size (required)
  teamSize: string | null;
  teamSizeRetryCount: number;

  // Step 5: Knowledge Base
  uploadedDocuments: UploadedDoc[];

  // Step 6: Telephony (only if AI Reception selected)
  telephony: "bring_own" | "default" | null;

  // Step 7: Summary & Confirmation
  confirmedFinal: boolean;
}

type FlowStep =
  | "STEP1_WELCOME"
  | "STEP2_NEEDS"
  | "STEP2_NEEDS_MORE"
  | "STEP2A_CALL_DETAILS"
  | "STEP3_LOCATIONS"
  | "STEP3_OPERATING_HOURS"
  | "STEP4_TEAM_SIZE"
  | "STEP4_TEAM_SIZE_RETRY"
  | "STEP5_KNOWLEDGE_BASE"
  | "STEP6_TELEPHONY"
  | "STEP7_SUMMARY_CONFIRM"
  | "COMPLETED";

// ── Voice Helper: Pick Best Female Voice (Strictly Female Only) ──
if (typeof window !== "undefined" && window.speechSynthesis) {
  try {
    window.speechSynthesis.getVoices();
  } catch {}
}

const MALE_VOICE_NAMES = [
  "david", "mark", "george", "richard", "james", "guy", "male", "stefan", "ravi",
  "sean", "paul", "brian", "alex", "daniel", "tom", "fred", "oliver", "rishi",
  "diego", "jorge", "thomas", "john", "michael", "william", "matthew", "andrew",
  "christopher", "joseph", "barry", "edward"
];

function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  for (const m of MALE_VOICE_NAMES) {
    if (name.includes(m)) return true;
  }
  return false;
}

function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const allVoices = window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) return null;

  // Filter out male voices completely
  const nonMaleVoices = allVoices.filter((v) => !isMaleVoice(v));

  const preferredNames = [
    "Microsoft Aria Online (Natural)",
    "Microsoft Jenny Online (Natural)",
    "Microsoft Zira Desktop",
    "Microsoft Zira",
    "Google US English Female",
    "Google UK English Female",
    "Samantha",
    "Victoria",
    "Karen",
    "Moira",
    "Tessa",
    "Fiona",
    "Veena",
    "Allison",
    "Ava",
    "Susan",
    "Aria",
    "Jenny",
    "Zira",
  ];

  for (const name of preferredNames) {
    const found = nonMaleVoices.find(
      (v) =>
        v.name.toLowerCase() === name.toLowerCase() ||
        v.name.toLowerCase().includes(name.toLowerCase())
    );
    if (found) return found;
  }

  const femaleKw = nonMaleVoices.find(
    (v) =>
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("woman") ||
      v.name.toLowerCase().includes("natural") ||
      v.name.toLowerCase().includes("online")
  );
  if (femaleKw) return femaleKw;

  const enNonMale = nonMaleVoices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (enNonMale) return enNonMale;

  if (nonMaleVoices.length > 0) return nonMaleVoices[0];

  return null;
}

// ── Smart Practice Detection from Website/Description ──
function detectPracticeCategory(orgName: string, text: string): {
  category: string;
  playerType: string;
} {
  const combined = `${orgName} ${text}`.toLowerCase();

  if (/dent|teeth|orthodont|oral|smile|molar|hygiene/.test(combined)) {
    return { category: "Dentist", playerType: "dental care" };
  }
  if (/cardio|heart|vascular|hypertension/.test(combined)) {
    return { category: "Cardiologist", playerType: "cardiology" };
  }
  if (/derm|skin|aesthetic|botox|facial|cosmetic/.test(combined)) {
    return { category: "Dermatologist", playerType: "dermatology & skin care" };
  }
  if (/pediatr|child|infant|toddler|kids|adolescent/.test(combined)) {
    return { category: "Pediatrician", playerType: "pediatric care" };
  }
  if (/eye|vision|optom|ophthalm|lasik/.test(combined)) {
    return { category: "Ophthalmologist", playerType: "eye & vision care" };
  }
  if (/ortho|bone|joint|spine|sports med|fracture|knee/.test(combined)) {
    return { category: "Orthopedic", playerType: "orthopedic & joint care" };
  }
  if (/therapy|counsel|psych|mental|behavioral|adhd|depression/.test(combined)) {
    return { category: "Therapist", playerType: "mental health & counseling" };
  }
  if (/ent|ear|nose|throat|sinus|audiol/.test(combined)) {
    return { category: "ENT Specialist", playerType: "ear, nose & throat care" };
  }
  if (/gastro|digest|stomach|colon|liver|endoscop/.test(combined)) {
    return { category: "Gastroenterologist", playerType: "gastroenterology" };
  }
  if (/fertility|ivf|obgyn|gyn|maternity|prenatal/.test(combined)) {
    return { category: "Gynecologist", playerType: "women's health" };
  }
  if (/surg|operating|procedure|general surgery/.test(combined)) {
    return { category: "General Surgery", playerType: "surgical care" };
  }
  if (/oncol|cancer|chemo|tumor/.test(combined)) {
    return { category: "Oncologist", playerType: "oncology care" };
  }
  if (/chiro|wellness|physio|rehab|physical therapy/.test(combined)) {
    return { category: "Diagnostics", playerType: "rehab & physical wellness" };
  }

  return { category: "General Physician", playerType: "primary healthcare" };
}

// ── Smart Location Scraper ──
function scrapeLocationsFromContext(
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Scoped Fallback Extraction Helpers (only active for the specific step) ──
function extractCategoryCorrection(text: string): string | null {
  const lower = text.toLowerCase();
  for (const cat of INITIAL_CATEGORIES) {
    if (lower.includes(cat.name.toLowerCase())) {
      return cat.name;
    }
    for (const ind of cat.industries) {
      if (lower.includes(ind.toLowerCase())) {
        return ind;
      }
    }
  }
  if (/dental|dentist/i.test(lower)) return "Dentist";
  if (/cardio/i.test(lower)) return "Cardiologist";
  if (/derm|skin/i.test(lower)) return "Dermatologist";
  if (/pediatr|child/i.test(lower)) return "Pediatrician";
  if (/ortho/i.test(lower)) return "Orthopedic";
  if (/therapy|mental|counsel/i.test(lower)) return "Therapist";
  if (/primary|family|general/i.test(lower)) return "General Physician";
  if (/vision|eye|optom/i.test(lower)) return "Ophthalmologist";
  return null;
}

function extractNeedsRequirements(text: string): string[] {
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

function extractCallDetails(text: string): { volume: string | null; international: boolean | null; isSkip: boolean } {
  const lower = text.toLowerCase().trim();
  const isSkip = /skip|pass|not sure|dont know|don't know|prefer not|leave it|no idea|rather not/i.test(lower);
  if (isSkip) return { volume: null, international: null, isSkip: true };

  let volume: string | null = null;
  const numMatch = lower.match(/(\d+)\s*(?:to|-)?\s*(\d+)?\s*(?:calls|rings|patients|a day|per day|daily)?/i);
  if (numMatch && parseInt(numMatch[1], 10) > 0) {
    const val1 = parseInt(numMatch[1], 10);
    const val2 = numMatch[2] ? parseInt(numMatch[2], 10) : null;
    volume = val2 ? `${val1}–${val2} calls/day` : `~${val1} calls/day`;
  } else if (/hundred|100\+|lots of calls|busy|heavy|non-stop/i.test(lower)) {
    volume = "80–100+ calls/day";
  } else if (/dozen|twenty|thirty|40|50|moderate/i.test(lower)) {
    volume = "30–50 calls/day";
  } else if (/few|quiet|low|10|15|under 20/i.test(lower)) {
    volume = "10–20 calls/day";
  }

  let international: boolean | null = null;
  if (/international|overseas|foreign|other countries|global/i.test(lower)) {
    international = !/no international|none|never|local only|domestic only/i.test(lower);
  } else if (/some international|yes.*international/i.test(lower)) {
    international = true;
  }

  return { volume, international, isSkip: false };
}

function extractCleanLocations(text: string, currentLocations: string[]): { primary: string | null; added: string[] } {
  const lower = text.toLowerCase().trim();
  let primary: string | null = null;

  for (const loc of currentLocations) {
    if (lower.includes(loc.toLowerCase())) {
      primary = loc;
      break;
    }
  }

  const junkWords = new Set([
    "yes", "no", "and", "also", "our", "the", "clinic", "branch", "here", "there", "we", "operate", "have", "location", "locations", "primary", "main", "office", "uptown", "downtown"
  ]);

  const added: string[] = [];
  const parts = text.split(/,|and|\/|\balso\b/i).map((s) => s.trim());
  for (const p of parts) {
    const cleaned = p.replace(/(?:we also have|we operate in|a branch in|a clinic in|our other|location in)\s+/i, "").trim();
    if (
      cleaned.length >= 3 &&
      cleaned.length < 32 &&
      !junkWords.has(cleaned.toLowerCase()) &&
      !currentLocations.some((c) => c.toLowerCase() === cleaned.toLowerCase())
    ) {
      added.push(cleaned);
    }
  }

  return { primary, added };
}

function extractOperatingHours(text: string): { hours: string | null; isSkip: boolean } {
  const lower = text.toLowerCase().trim();
  if (/skip|pass|later|not sure|dont know|don't know|no hours|flexible|leave it|decline/i.test(lower)) {
    return { hours: null, isSkip: true };
  }

  const hasHoursSignals = /\d{1,2}\s*(?::\d{2})?\s*(?:am|pm)?|monday|friday|saturday|sunday|weekend|9\s*to\s*5|8\s*to\s*5|weekdays|open from/i.test(lower);
  if (hasHoursSignals) {
    return { hours: text.trim(), isSkip: false };
  }

  return { hours: null, isSkip: false };
}

function cleanTeamSize(val: string): string {
  const trimmed = val.trim();
  return trimmed
    .replace(/^a\s+team\s+of\s+/i, "")
    .replace(/^team\s+of\s+/i, "")
    .replace(/staff$/i, "")
    .trim();
}

function extractStrictTeamSize(text: string): string | null {
  const lower = text.toLowerCase().trim();

  // If user replies with hours or phone info, DO NOT match it as team size
  if (lower.includes("am") || lower.includes("pm") || lower.includes("o'clock") || lower.includes("hour")) {
    return null;
  }

  if (/just me|solo|myself|one person|only me|just myself/i.test(lower)) {
    return "Solo provider";
  }
  if (/dozen/i.test(lower)) {
    return "12";
  }

  const numMatch = lower.match(/(?:team of\s*|we have\s*|about\s*|around\s*)?(\d+)\s*(?:people|staff|nurses|providers|doctors|of us|members)?/i);
  if (numMatch && parseInt(numMatch[1], 10) > 0) {
    const num = parseInt(numMatch[1], 10);
    if (num === 1) return "Solo provider";
    return `${num}`;
  }

  if (/small team|few of us|two or three/i.test(lower)) {
    return "Small team";
  }
  if (/large team|dozens|big staff/i.test(lower)) {
    return "Large team";
  }

  const cleaned = cleanTeamSize(text);
  return cleaned || null;
}

function extractTelephonyChoice(text: string): "bring_own" | "default" | "skip" {
  const lower = text.toLowerCase().trim();
  if (/skip|pass|not sure|later|dont know|don't know|leave it|figure it out|any/i.test(lower)) {
    return "skip";
  }
  if (/bring|our own|existing|transfer|keep|current number/i.test(lower)) {
    return "bring_own";
  }
  if (/default|give us|provide|new number|new one|assign|one you provide/i.test(lower)) {
    return "default";
  }
  return "skip";
}

export const VoiceOnboardingScreen: React.FC<VoiceOnboardingProps> = ({
  orgName,
  country,
  mode,
  websiteUrl,
  description,
  onComplete,
  onSwitchToTyping,
  onBack,
}) => {
  const detected = detectPracticeCategory(orgName, mode === "website" ? websiteUrl : description);
  const initialScrapedLocations = scrapeLocationsFromContext(websiteUrl, description, country);

  // ── Tracked State Record (Source of truth) ──
  const recordRef = useRef<OnboardingRecord>({
    categoryConfirmed: false,
    category: detected.category,
    playerType: detected.playerType,
    industry: "Healthcare",
    requirements: [],
    needsFollowupCount: 0,
    callVolume: null,
    internationalCalls: null,
    locations: initialScrapedLocations,
    primaryLocation: initialScrapedLocations[0] || null,
    operatingHours: null,
    teamSize: null,
    teamSizeRetryCount: 0,
    uploadedDocuments: [],
    telephony: null,
    confirmedFinal: false,
  });

  const currentStepRef = useRef<FlowStep>("STEP1_WELCOME");
  const lastAssistantMessageRef = useRef<string>("");
  const isProcessingRef = useRef<boolean>(false);
  const lastSpokenEndTimeRef = useRef<number>(0);

  // Ref to always hold latest handler to prevent stale closures in speech recognition
  const handleUserResponseRef = useRef<(text: string) => void>(() => {});

  // ── UI State ──
  const [avatarState, setAvatarState] = useState<AvatarState>("speaking");
  const [thinkingMessage, setThinkingMessage] = useState<string>("Listening...");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveInterimText, setLiveInterimText] = useState<string>("");
  const [typedInput, setTypedInput] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMicAvailable, setIsMicAvailable] = useState<boolean>(true);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const [activeUiStep, setActiveUiStep] = useState<FlowStep>("STEP1_WELCOME");
  const [uploadedDocsState, setUploadedDocsState] = useState<UploadedDoc[]>([]);
  const [summaryRecordState, setSummaryRecordState] = useState<OnboardingRecord>({ ...recordRef.current });

  // Audio & Speech refs
  const isAriaSpeakingRef = useRef<boolean>(false);
  const whisperRecorderRef = useRef<WhisperAudioRecorder | null>(null);
  const isWhisperAvailableRef = useRef<boolean>(true);
  const speechRecognitionRef = useRef<any>(null);
  const summaryMsgIdRef = useRef<string | null>(null);
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  const scrollToBottom = useCallback(() => {
    if (chatScrollBottomRef.current) {
      chatScrollBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, liveInterimText, uploadedDocsState, activeUiStep, scrollToBottom]);

  // ── Synchronized Typewriter Reveal ──
  const startTypewriterReveal = useCallback(
    (messageId: string, fullText: string, durationEstimateMs: number, onDone?: () => void) => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }

      const totalChars = fullText.length;
      if (totalChars === 0) {
        onDone?.();
        return;
      }

      const intervalMs = 35;
      const charsPerTick = Math.max(1, Math.ceil(totalChars / (durationEstimateMs / intervalMs)));
      let currentVisible = 0;

      typewriterTimerRef.current = setInterval(() => {
        currentVisible = Math.min(totalChars, currentVisible + charsPerTick);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  visibleChars: currentVisible,
                  isStreaming: currentVisible < totalChars,
                }
              : msg
          )
        );

        if (currentVisible >= totalChars) {
          if (typewriterTimerRef.current) {
            clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
          }
          onDone?.();
        }
      }, intervalMs);
    },
    []
  );

  // ── Aria Speak Engine (TTS + Lip Sync) ──
  const speakAriaMessage = useCallback(
    (text: string, onEnd?: () => void, customMsgId?: string) => {
      // Guard against duplicate stall: if duplicate, restart listening and continue
      if (text === lastAssistantMessageRef.current && lastAssistantMessageRef.current.length > 0) {
        console.warn("[Voice Setup] Duplicate detected, ensuring mic is active.");
        startListening();
        return;
      }
      lastAssistantMessageRef.current = text;

      const msgId = customMsgId || `msg-assistant-${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          sender: "assistant",
          text,
          timestamp: nowTime,
          isStreaming: true,
          visibleChars: 0,
        },
      ]);

      stopListening();
      setAvatarState("speaking");
      isAriaSpeakingRef.current = true;

      const durationMs = Math.max(1800, Math.min(text.length * 50, 9000));

      if (isMuted || typeof window === "undefined" || !window.speechSynthesis) {
        startTypewriterReveal(msgId, text, durationMs, () => {
          isAriaSpeakingRef.current = false;
          lastSpokenEndTimeRef.current = Date.now();
          setAvatarState("listening");
          onEnd?.();
          setTimeout(() => {
            if (!isAriaSpeakingRef.current) startListening();
          }, 350);
        });
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.15; // Set higher pitch so voice is clearly feminine

        const voice = getFemaleVoice();
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || "en-US";
        } else {
          utterance.lang = "en-US";
        }

        utterance.onstart = () => {
          isAriaSpeakingRef.current = true;
          setAvatarState("speaking");
        };

        startTypewriterReveal(msgId, text, durationMs);

        const handleSpeechEnd = () => {
          isAriaSpeakingRef.current = false;
          lastSpokenEndTimeRef.current = Date.now();
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === msgId ? { ...msg, visibleChars: text.length, isStreaming: false } : msg
            )
          );
          if (typewriterTimerRef.current) {
            clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
          }

          setAvatarState("listening");
          onEnd?.();
          setTimeout(() => {
            if (!isAriaSpeakingRef.current) startListening();
          }, 350);
        };

        utterance.onend = handleSpeechEnd;
        utterance.onerror = handleSpeechEnd;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("TTS failed, using typewriter fallback:", err);
        startTypewriterReveal(msgId, text, durationMs, () => {
          isAriaSpeakingRef.current = false;
          lastSpokenEndTimeRef.current = Date.now();
          setAvatarState("listening");
          onEnd?.();
          startListening();
        });
      }
    },
    [isMuted, startTypewriterReveal]
  );

  const stopListening = useCallback(() => {
    if (whisperRecorderRef.current) {
      try { whisperRecorderRef.current.stop(); } catch {}
      whisperRecorderRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (isAriaSpeakingRef.current || isMuted || currentStepRef.current === "COMPLETED") return;

    const startWebSpeechFallback = () => {
      const SpeechRecClass =
        typeof window !== "undefined"
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (!SpeechRecClass) {
        setIsMicAvailable(false);
        setMicNotice("Speech recognition is unavailable. Please type your responses below.");
        return;
      }

      if (speechRecognitionRef.current) return;

      try {
        const recognition = new SpeechRecClass();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setAvatarState("listening");
        };

        recognition.onresult = (event: any) => {
          if (isAriaSpeakingRef.current) return;
          if (Date.now() - lastSpokenEndTimeRef.current < 400) return;

          const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
          if (transcript) {
            handleUserResponseRef.current(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          const code = err?.error;
          if (code === "not-allowed" || code === "service-not-allowed") {
            setIsMicAvailable(false);
            setMicNotice("Microphone permission denied. You can easily type your replies below.");
          }
          speechRecognitionRef.current = null;
        };

        recognition.onend = () => {
          speechRecognitionRef.current = null;
          if (!isAriaSpeakingRef.current && !isMuted && currentStepRef.current !== "COMPLETED") {
            setTimeout(() => {
              if (!isAriaSpeakingRef.current && !speechRecognitionRef.current) {
                startListening();
              }
            }, 300);
          }
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Web Speech API error:", err);
        speechRecognitionRef.current = null;
      }
    };

    // Primary: Neural Whisper STT
    if (isWhisperAvailableRef.current) {
      try {
        const recorder = new WhisperAudioRecorder({
          language: "en",
          silenceThreshold: 0.02,
          silenceDurationMs: 850,
          maxDurationMs: 9000,
          onAudioLevel: (level: number) => {
            if (level > 0.05 && !isAriaSpeakingRef.current) {
              setAvatarState("listening");
            }
          },
          onTranscript: (transcript: string) => {
            if (isAriaSpeakingRef.current) return;
            if (Date.now() - lastSpokenEndTimeRef.current < 400) return;

            const text = transcript.trim();
            if (text) {
              handleUserResponseRef.current(text);
            }
          },
          onError: (err, isServerUnavailable) => {
            if (isServerUnavailable) {
              isWhisperAvailableRef.current = false;
            }
            try { recorder.stop(); } catch {}
            whisperRecorderRef.current = null;
            startWebSpeechFallback();
          },
        });

        recorder.start().catch(() => {
          isWhisperAvailableRef.current = false;
          startWebSpeechFallback();
        });

        whisperRecorderRef.current = recorder;
        return;
      } catch (err) {
        isWhisperAvailableRef.current = false;
        startWebSpeechFallback();
        return;
      }
    }

    startWebSpeechFallback();
  }, [isMuted]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      toast.info("Microphone unmuted");
      setTimeout(() => startListening(), 200);
    } else {
      setIsMuted(true);
      stopListening();
      setAvatarState("idle");
      toast.info("Microphone muted. You can type replies below.");
    }
  };

  // ── LLM Extraction Call (with instant fallback) ──
  const requestLLMExtraction = async (
    step: string,
    userText: string
  ): Promise<{
    intent: "answer" | "skip" | "correction" | "unclear" | "yes" | "no";
    extracted: any;
    acknowledgement: string;
  } | null> => {
    try {
      const res = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          userMessage: userText,
          context: {
            category: recordRef.current.category,
            requirements: recordRef.current.requirements,
            locations: recordRef.current.locations,
            primaryLocation: recordRef.current.primaryLocation,
            teamSize: recordRef.current.teamSize,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.unconfigured || data.error) return null;
      return data;
    } catch {
      return null;
    }
  };

  // ── Core User Turn Handler ──
  const handleUserResponse = async (userText: string) => {
    if (!userText.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;

    // FIX 1: Robust Echo Filter (only drops if 8+ words and closely matches last spoken text)
    const lastSpoken = lastAssistantMessageRef.current.toLowerCase();
    const userLower = userText.toLowerCase().trim();
    const words = userLower.split(/\s+/).filter(Boolean);
    if (words.length >= 8 && lastSpoken.includes(userLower)) {
      console.log("[Voice Setup] Ignored voice echo from Aria:", userText);
      isProcessingRef.current = false;
      return;
    }

    // Add user message to conversation feed
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveInterimText("");

    setAvatarState("thinking");
    setThinkingMessage("Reflecting...");

    // Try structured LLM extraction first; fallback to local scoped extraction
    const llmResult = await requestLLMExtraction(currentStepRef.current, userText);

    setTimeout(() => {
      advanceConversationStateMachine(userText, llmResult);
      isProcessingRef.current = false;
    }, 300);
  };

  handleUserResponseRef.current = handleUserResponse;

  // ── The Natural Conversation State Machine ──
  const advanceConversationStateMachine = (
    userText: string,
    llm: { intent: string; extracted: any; acknowledgement: string } | null
  ) => {
    const record = recordRef.current;
    const lower = userText.toLowerCase().trim();
    const currentStep = currentStepRef.current;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: WELCOME (Confirm service / category)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP1_WELCOME") {
      let isCorrection = llm?.intent === "correction" || /no\b|not\b|actually|instead|rather/i.test(lower);
      let correctedCat = llm?.extracted?.category || extractCategoryCorrection(userText);

      let ack = "";
      if (isCorrection && correctedCat) {
        record.category = correctedCat;
        record.playerType = `${correctedCat.toLowerCase()} care`;
        record.categoryConfirmed = true;
        ack = llm?.acknowledgement || `${correctedCat}, got it.`;
      } else {
        record.categoryConfirmed = true;
        ack = llm?.acknowledgement || "Great to hear.";
      }

      // Check if user also mentioned needs in the same breath
      const earlyNeeds = llm?.extracted?.requirements || extractNeedsRequirements(userText);
      if (earlyNeeds && earlyNeeds.length > 0) {
        record.requirements = Array.from(new Set([...record.requirements, ...earlyNeeds]));
        currentStepRef.current = "STEP2_NEEDS_MORE";
        setActiveUiStep("STEP2_NEEDS_MORE");
        const nextQ = `${ack} Is there anything else slowing down your team?`;
        speakAriaMessage(nextQ);
        return;
      }

      // Move to Step 2: Needs (Problem-led)
      currentStepRef.current = "STEP2_NEEDS";
      setActiveUiStep("STEP2_NEEDS");
      const nextQ = `${ack} Tell me a bit about where your team spends the most time today. Is it documentation, reaching out to clients, handling inbound calls, or getting claims filed?`;
      speakAriaMessage(nextQ);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: NEEDS (Problem-led, silent mapping)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP2_NEEDS") {
      const detected = llm?.extracted?.requirements || extractNeedsRequirements(userText);
      if (detected.length > 0) {
        record.requirements = Array.from(new Set([...record.requirements, ...detected]));
      }

      // Reflect naturally without confirmation words
      let ack = "";
      if (llm?.acknowledgement) {
        ack = llm.acknowledgement;
      } else if (detected.includes("AI Reception")) {
        ack = "Front desk phones can get pretty hectic during peak hours.";
      } else if (detected.includes("Scribe")) {
        ack = "Charting notes after hours really eats into your day.";
      } else if (detected.includes("RCM")) {
        ack = "Dealing with insurance claims and denials is a major headache.";
      } else if (detected.includes("EHR")) {
        ack = "Managing patient history and intake takes a lot of coordination.";
      } else {
        ack = "Those operational hurdles definitely slow a team down.";
      }

      currentStepRef.current = "STEP2_NEEDS_MORE";
      setActiveUiStep("STEP2_NEEDS_MORE");
      const nextQ = `${ack} Is there anything else slowing down your team?`;
      speakAriaMessage(nextQ);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: NEEDS FOLLOW-UP (Loop until nothing more)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP2_NEEDS_MORE") {
      const isDone =
        llm?.intent === "no" ||
        llm?.intent === "skip" ||
        /no\b|nothing|that's all|thats all|that is all|that's it|thats it|nope|all good|we're good|we are good|nothing else|none/i.test(
          lower
        );

      if (!isDone) {
        const moreNeeds = llm?.extracted?.requirements || extractNeedsRequirements(userText);
        if (moreNeeds.length > 0) {
          record.requirements = Array.from(new Set([...record.requirements, ...moreNeeds]));
          let ack = llm?.acknowledgement || "We can certainly streamline that too.";
          const nextQ = `${ack} Anything else you'd like to include?`;
          speakAriaMessage(nextQ);
          return;
        }
      }

      // Transition out of Needs
      // If AI Reception selected -> Step 2a: Call Details
      if (record.requirements.includes("AI Reception")) {
        currentStepRef.current = "STEP2A_CALL_DETAILS";
        setActiveUiStep("STEP2A_CALL_DETAILS");
        const nextQ = "Roughly how many calls do you receive a day, and do you get any international callers? Feel free to skip this if you'd rather not say.";
        speakAriaMessage(nextQ);
        return;
      }

      // Otherwise -> Step 3: Locations
      advanceToLocationsStep();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2A: CALL DETAILS (Only if AI Reception selected - Skippable)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP2A_CALL_DETAILS") {
      const parsed = llm?.extracted
        ? {
            volume: llm.extracted.callVolume || null,
            international: llm.extracted.internationalCalls ?? null,
            isSkip: llm.intent === "skip" || /skip|pass|not sure|dont know|rather not/i.test(lower),
          }
        : extractCallDetails(userText);

      let ack = "";
      if (parsed.isSkip) {
        record.callVolume = null;
        record.internationalCalls = null;
        ack = llm?.acknowledgement || "No problem.";
      } else {
        if (parsed.volume) record.callVolume = parsed.volume;
        if (parsed.international !== null) record.internationalCalls = parsed.international;
        ack = llm?.acknowledgement || "A steady call volume.";
      }

      advanceToLocationsStep(ack);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3: LOCATIONS (Primary & other branches)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP3_LOCATIONS") {
      let chosenPrimary = llm?.extracted?.primaryLocation;
      let addedLocations = llm?.extracted?.locations || [];

      if (!chosenPrimary && !addedLocations.length) {
        const parsed = extractCleanLocations(userText, record.locations);
        chosenPrimary = parsed.primary;
        addedLocations = parsed.added;
      }

      if (!chosenPrimary) {
        chosenPrimary = record.locations[0] || "Main Clinic";
      }

      record.primaryLocation = chosenPrimary;
      if (!record.locations.includes(chosenPrimary)) {
        record.locations = [chosenPrimary, ...record.locations];
      }
      if (addedLocations.length > 0) {
        record.locations = Array.from(new Set([...record.locations, ...addedLocations]));
      }

      let ack = llm?.acknowledgement || `${chosenPrimary}, sounds good.`;

      // Next ask for operating hours (Step 3b - Skippable)
      currentStepRef.current = "STEP3_OPERATING_HOURS";
      setActiveUiStep("STEP3_OPERATING_HOURS");
      const nextQ = `${ack} What are your operating hours across these locations? You can also skip this if you prefer.`;
      speakAriaMessage(nextQ);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3B: OPERATING HOURS (Skippable)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP3_OPERATING_HOURS") {
      const isSkip = llm?.intent === "skip" || /skip|pass|later|not sure|dont know|leave it/i.test(lower);

      let ack = "";
      if (isSkip) {
        record.operatingHours = null;
        ack = llm?.acknowledgement || "No problem.";
      } else {
        const hours = llm?.extracted?.operatingHours || extractOperatingHours(userText).hours;
        if (hours) {
          record.operatingHours = hours;
          ack = llm?.acknowledgement || "Consistent daytime hours.";
        } else {
          record.operatingHours = null;
          ack = "Fair enough.";
        }
      }

      // Move to Step 4: Team Size (Required!)
      currentStepRef.current = "STEP4_TEAM_SIZE";
      setActiveUiStep("STEP4_TEAM_SIZE");
      const nextQ = `${ack} How many people are on your team today?`;
      speakAriaMessage(nextQ);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: TEAM SIZE (Required - Never skip, retry once if unclear)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP4_TEAM_SIZE" || currentStep === "STEP4_TEAM_SIZE_RETRY") {
      const team = llm?.extracted?.teamSize || extractStrictTeamSize(userText);

      if (!team) {
        if (currentStep === "STEP4_TEAM_SIZE" && record.teamSizeRetryCount === 0) {
          record.teamSizeRetryCount = 1;
          currentStepRef.current = "STEP4_TEAM_SIZE_RETRY";
          setActiveUiStep("STEP4_TEAM_SIZE_RETRY");
          const retryQ = "Roughly how many staff, including providers and front desk?";
          speakAriaMessage(retryQ);
          return;
        }

        // Second retry: accept any non-empty reasonable description, never fall back to fake "5 staff"
        record.teamSize = cleanTeamSize(userText.trim().slice(0, 30));
      } else {
        record.teamSize = cleanTeamSize(team);
      }

      const cleanNum = cleanTeamSize(record.teamSize);
      const teamAckPhrase = cleanNum.toLowerCase().includes("solo")
        ? "A solo practice, that gives us good context."
        : `A team of ${cleanNum}, that gives us good context.`;

      const ack =
        llm?.acknowledgement && !/team of team/i.test(llm.acknowledgement)
          ? llm.acknowledgement.replace(/team of team of/gi, "team of").replace(/a team of team of/gi, "a team of")
          : teamAckPhrase;

      // Move to Step 5: Knowledge Base
      currentStepRef.current = "STEP5_KNOWLEDGE_BASE";
      setActiveUiStep("STEP5_KNOWLEDGE_BASE");
      const nextQ = `${ack} If you have any pricing sheets, service lists, or clinic guidelines you'd like your agent to know, feel free to drop them into the upload box now, or we can move right along.`;
      speakAriaMessage(nextQ);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 5: KNOWLEDGE BASE (Upload context or move on)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP5_KNOWLEDGE_BASE") {
      let ack = "";
      if (record.uploadedDocuments.length > 0) {
        ack = "Thank you for sharing those files. They've been attached to your agent's knowledge base.";
      } else {
        ack = "Moving right along.";
      }

      // If AI Reception selected -> Step 6: Telephony
      if (record.requirements.includes("AI Reception")) {
        currentStepRef.current = "STEP6_TELEPHONY";
        setActiveUiStep("STEP6_TELEPHONY");
        const nextQ = `${ack} For handling patient calls, would you prefer to bring your own number, or use one we provide? You can also skip this if you'd rather decide later.`;
        speakAriaMessage(nextQ);
        return;
      }

      // If AI Reception NOT selected -> Skip Telephony directly to Step 7: Summary!
      advanceToSummaryStep(ack);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 6: TELEPHONY (Only if AI Reception selected - Skippable)
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP6_TELEPHONY") {
      const choice = llm?.extracted?.telephony || extractTelephonyChoice(userText);

      let ack = "";
      if (choice === "bring_own") {
        record.telephony = "bring_own";
        ack = llm?.acknowledgement || "We'll connect your existing practice number.";
      } else if (choice === "default") {
        record.telephony = "default";
        ack = llm?.acknowledgement || "We'll set you up with a dedicated number.";
      } else {
        record.telephony = null; // Skipped -> null (do NOT present as pending!)
        ack = llm?.acknowledgement || "Fair enough.";
      }

      advanceToSummaryStep(ack);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 7: SUMMARY & CONFIRMATION
    // ─────────────────────────────────────────────────────────────
    if (currentStep === "STEP7_SUMMARY_CONFIRM") {
      const isConfirmed =
        llm?.intent === "yes" ||
        /yes\b|correct|looks right|looks good|confirm|perfect|all good|proceed|great|approve|continue/i.test(
          lower
        );

      if (isConfirmed) {
        completeAndHandover();
        return;
      }

      // Check if user is asking for a correction
      let changed = false;

      // Category correction
      const cat = llm?.extracted?.category || extractCategoryCorrection(userText);
      if (cat) {
        record.category = cat;
        record.playerType = `${cat.toLowerCase()} care`;
        changed = true;
      }

      // Team size correction
      const team = llm?.extracted?.teamSize || extractStrictTeamSize(userText);
      if (team) {
        record.teamSize = team;
        changed = true;
      }

      // Primary location correction
      const locMatch = userText.match(/(?:location|branch|clinic|city)\s+(?:is|to)\s+([A-Za-z0-9\s]+?)(?:,|\.|$)/i);
      if (locMatch && locMatch[1]) {
        const newPrimary = locMatch[1].trim();
        record.primaryLocation = newPrimary;
        if (!record.locations.includes(newPrimary)) {
          record.locations = [newPrimary, ...record.locations];
        }
        changed = true;
      }

      setSummaryRecordState({ ...record });

      if (changed) {
        speakAriaMessage("Updated that. Does everything look right now?");
      } else {
        // If unclear, ask once in different words
        speakAriaMessage("Does this setup look right, or would you like to adjust any details?");
      }
    }
  };

  // ── Helper Transitions ──
  const advanceToLocationsStep = (ackPrefix?: string) => {
    const record = recordRef.current;
    currentStepRef.current = "STEP3_LOCATIONS";
    setActiveUiStep("STEP3_LOCATIONS");

    let locQ = "";
    if (record.locations.length > 0) {
      const list = record.locations.join(" and ");
      locQ = `We found that you operate in ${list}. Which one is your primary, and do you operate anywhere else?`;
    } else {
      locQ = "Where does your practice operate, and which of those is your main location?";
    }

    const message = ackPrefix ? `${ackPrefix} ${locQ}` : locQ;
    speakAriaMessage(message);
  };

  const advanceToSummaryStep = (ackPrefix?: string) => {
    const record = recordRef.current;
    currentStepRef.current = "STEP7_SUMMARY_CONFIRM";
    setActiveUiStep("STEP7_SUMMARY_CONFIRM");
    setSummaryRecordState({ ...record });

    const reqsText = record.requirements.length > 0 ? record.requirements.join(", ") : "practice workflows";
    const primaryLoc = record.primaryLocation || "your clinic";
    const cleanNum = cleanTeamSize(record.teamSize || "your staff");
    const teamSummaryPhrase =
      cleanNum.toLowerCase().includes("solo")
        ? "a solo practice"
        : cleanNum === "your staff"
        ? "your staff"
        : `a team of ${cleanNum}`;

    const summarySpeech = `${ackPrefix ? ackPrefix + " " : ""}Here is a quick look at your setup: ${record.category}, focusing on ${reqsText}, based at ${primaryLoc}, with ${teamSummaryPhrase}. Does this look right to you?`;
    const summaryMsgId = `msg-assistant-summary-${Date.now()}`;
    summaryMsgIdRef.current = summaryMsgId;
    speakAriaMessage(summarySpeech, undefined, summaryMsgId);
  };

  // ── Knowledge Base Upload Handlers ──
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocs: UploadedDoc[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const doc: UploadedDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        sizeLabel: formatBytes(f.size),
      };
      newDocs.push(doc);
    }

    const updated = [...recordRef.current.uploadedDocuments, ...newDocs];
    recordRef.current.uploadedDocuments = updated;
    setUploadedDocsState(updated);
    toast.success(`Attached ${newDocs.length} document(s).`);

    if (currentStepRef.current === "STEP5_KNOWLEDGE_BASE") {
      setTimeout(() => {
        handleUserResponseRef.current(`Attached ${newDocs.map((d) => d.name).join(", ")}`);
      }, 450);
    }
  };

  const removeUploadedDoc = (docId: string) => {
    const updated = recordRef.current.uploadedDocuments.filter((d) => d.id !== docId);
    recordRef.current.uploadedDocuments = updated;
    setUploadedDocsState(updated);
  };

  const handleSkipKb = () => {
    handleUserResponseRef.current("Move right along without documents");
  };

  // ── Final Complete & Handover ──
  const completeAndHandover = () => {
    currentStepRef.current = "COMPLETED";
    setActiveUiStep("COMPLETED");

    const record = recordRef.current;
    record.confirmedFinal = true;

    const data: CollectedOnboardingData = {
      confirmedCategory: record.category,
      industry: record.industry,
      requirements: record.requirements,
      callVolume: record.callVolume,
      internationalCalls: record.internationalCalls,
      locations: record.locations,
      primaryLocation: record.primaryLocation,
      operatingHours: record.operatingHours,
      teamSize: record.teamSize || "Staff",
      uploadedDocuments: record.uploadedDocuments,
      telephony: record.telephony,
    };

    try {
      const allProcs = getStoredProcesses();
      const updatedProcs = allProcs.map((p) => {
        if ((p as any).categoryName === "Healthcare" || p.industryCategory === "Healthcare" || !p.industryCategory) {
          return {
            ...p,
            industryCategory: data.confirmedCategory,
            connectedToAiReceptionist: data.requirements.includes("AI Reception"),
            receptionEnabled: data.requirements.includes("AI Reception"),
          };
        }
        return p;
      });
      saveStoredProcesses(updatedProcs);
      window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
    } catch (e) {
      console.warn("Process mapping notice:", e);
    }

    speakAriaMessage("Everything is set. Taking you to your dashboard now.", () => {
      setTimeout(() => {
        onComplete(data);
      }, 1000);
    });
  };

  // ── Welcome Greeting on Mount (Guaranteed Female Voice) ──
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const sourceContext = mode === "website" ? "website" : "description";
    const initialWelcome = `Welcome to MantraAssist! Based on your ${sourceContext}, we identified that you provide ${recordRef.current.playerType} to your patients. Is that right?`;

    const triggerGreeting = () => {
      speakAriaMessage(initialWelcome);
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();

      const existingVoice = getFemaleVoice();
      if (existingVoice) {
        const timer = setTimeout(triggerGreeting, 600);
        return () => clearTimeout(timer);
      }

      let fired = false;
      const handleVoicesChanged = () => {
        if (fired) return;
        fired = true;
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        setTimeout(triggerGreeting, 350);
      };

      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

      const fallbackTimer = setTimeout(() => {
        if (!fired) {
          fired = true;
          window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
          triggerGreeting();
        }
      }, 1100);

      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        clearTimeout(fallbackTimer);
      };
    } else {
      const timer = setTimeout(triggerGreeting, 600);
      return () => clearTimeout(timer);
    }
  }, [mode, speakAriaMessage]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const text = typedInput.trim();
    setTypedInput("");
    handleUserResponseRef.current(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#0D131B] text-white overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          LEFT SIDE: AVATAR STAGE (UNTOUCHED)
      ───────────────────────────────────────────────────────────── */}
      <section
        className="w-full lg:w-1/2 h-[45vh] lg:h-full relative flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 shrink-0"
        style={{
          background: "linear-gradient(145deg, #0d141e 0%, #151e2b 45%, #1f2d3f 100%)",
        }}
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/15 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative z-20 w-full flex items-center justify-between p-6 sm:p-8 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-7 w-auto drop-shadow-md"
              style={{ filter: "brightness(0) invert(1)" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="hidden sm:inline-block h-4 w-px bg-white/20" />
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Voice Onboarding Specialist
            </span>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        <AnimatedAvatar
          state={avatarState}
          avatarName="Aria"
          thinkingMessage={thinkingMessage}
          className="flex-1 w-full min-h-0"
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT SIDE: CONVERSATION PANEL
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full lg:w-1/2 h-[55vh] lg:h-full flex flex-col bg-white text-slate-900 overflow-hidden relative">
        <header className="h-16 px-6 sm:px-8 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-xs"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {orgName || "Your Organization"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {recordRef.current.category} · Live AI Voice Setup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchToTyping}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 border border-slate-200 cursor-pointer shadow-2xs"
            style={{ fontFamily: "Inter, sans-serif" }}
            title="Exit voice mode and finish via typing"
          >
            <span>Switch to typing</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </header>

        {micNotice && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3 shrink-0 z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{micNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setMicNotice(null)}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/40 relative">
          <div className="p-6 sm:p-8 space-y-4">
            {(() => {
              let summaryMsgIndex = summaryMsgIdRef.current
                ? messages.findIndex((m) => m.id === summaryMsgIdRef.current)
                : -1;

              if (
                summaryMsgIndex === -1 &&
                (activeUiStep === "STEP7_SUMMARY_CONFIRM" || activeUiStep === "COMPLETED")
              ) {
                summaryMsgIndex = messages.findIndex((m) =>
                  m.text.includes("Here is a quick look at your setup")
                );
              }

              const preSummaryMessages =
                summaryMsgIndex !== -1 ? messages.slice(0, summaryMsgIndex + 1) : messages;
              const postSummaryMessages =
                summaryMsgIndex !== -1 ? messages.slice(summaryMsgIndex + 1) : [];

              const renderMessageBubble = (msg: ChatMessage) => {
                const isAssistant = msg.sender === "assistant";
                const visibleText =
                  isAssistant && msg.visibleChars !== undefined
                    ? msg.text.slice(0, msg.visibleChars)
                    : msg.text;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} transition-all`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-xs ${
                        isAssistant
                          ? "bg-white text-slate-900 rounded-tl-xs border border-slate-200 shadow-slate-100"
                          : "bg-[#182230] text-white rounded-tr-xs shadow-slate-900/10"
                      }`}
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {isAssistant && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 mb-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Aria</span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{visibleText}</p>

                      {isAssistant && msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-500 rounded-xs animate-pulse align-middle" />
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              };

              return (
                <>
                  {preSummaryMessages.map((msg) => renderMessageBubble(msg))}

                  {/* STEP 5: Knowledge Base Upload Card in Chat */}
                  {activeUiStep === "STEP5_KNOWLEDGE_BASE" && (
                    <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 sm:p-5 my-2 animate-fadeIn max-w-[92%] sm:max-w-[85%]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                              Knowledge Base Upload
                            </h4>
                            <p className="text-[11px] text-slate-500">Pricing, services, practice guidelines</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSkipKb}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Skip
                        </button>
                      </div>

                      <div className="relative border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 p-5 text-center cursor-pointer transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.csv"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-800">
                          Click or drag files here to upload
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Supports PDF, DOC, DOCX, TXT, CSV
                        </p>
                      </div>

                      {uploadedDocsState.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-semibold text-slate-600">Attached files:</p>
                          {uploadedDocsState.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">{doc.sizeLabel}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedDoc(doc.id)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="Remove file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleUserResponseRef.current("Attached documents")}
                            className="w-full mt-2 py-2 px-3 rounded-lg bg-[#182230] hover:bg-black text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Continue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 7: Clean Summary Card (Only shows what user actually shared, no pending/skipped placeholders) */}
                  {(activeUiStep === "STEP7_SUMMARY_CONFIRM" || activeUiStep === "COMPLETED") && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 my-3 animate-fadeIn max-w-[94%] sm:max-w-[88%] text-left">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                              Onboarding Summary
                            </h4>
                            <p className="text-[11px] text-slate-500">{orgName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3.5 text-xs text-slate-700">
                        {/* Category & Industry */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Specialty:</span>
                          </div>
                          <span className="font-semibold text-slate-900 text-right">
                            {summaryRecordState.category} ({summaryRecordState.industry})
                          </span>
                        </div>

                        {/* Requirements (if any chosen) */}
                        {summaryRecordState.requirements.length > 0 && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              <span>Workflows:</span>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {summaryRecordState.requirements.map((r) => (
                                <span
                                  key={r}
                                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-100"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Call Details (ONLY rendered if provided) */}
                        {(summaryRecordState.callVolume || summaryRecordState.internationalCalls !== null) && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                              <span>Call Details:</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-right">
                              {[
                                summaryRecordState.callVolume,
                                summaryRecordState.internationalCalls === true
                                  ? "International calls"
                                  : summaryRecordState.internationalCalls === false
                                  ? "Domestic only"
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                        )}

                        {/* Locations with Primary marked */}
                        {summaryRecordState.locations.length > 0 && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              <span>Locations:</span>
                            </div>
                            <div className="text-right space-y-0.5">
                              {summaryRecordState.locations.map((loc) => {
                                const isPrimary = loc === summaryRecordState.primaryLocation;
                                return (
                                  <div key={loc} className="flex items-center gap-1.5 justify-end">
                                    <span className="font-medium text-slate-800">{loc}</span>
                                    {isPrimary && (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Operating Hours (ONLY rendered if provided) */}
                        {summaryRecordState.operatingHours && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>Operating Hours:</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-right">
                              {summaryRecordState.operatingHours}
                            </span>
                          </div>
                        )}

                        {/* Team Size (Required, always appears) */}
                        {summaryRecordState.teamSize && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              <span>Team Size:</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-right">
                              {summaryRecordState.teamSize.toLowerCase().includes("solo")
                                ? summaryRecordState.teamSize
                                : `Team of ${cleanTeamSize(summaryRecordState.teamSize)}`}
                            </span>
                          </div>
                        )}

                        {/* Uploaded Documents (ONLY rendered if documents exist) */}
                        {summaryRecordState.uploadedDocuments.length > 0 && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>Knowledge Base:</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-right">
                              {summaryRecordState.uploadedDocuments.length} document(s) attached
                            </span>
                          </div>
                        )}

                        {/* Telephony (ONLY rendered if chosen) */}
                        {summaryRecordState.telephony && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                              <span>Telephony:</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-right">
                              {summaryRecordState.telephony === "bring_own"
                                ? "Bring own number"
                                : "Default provided number"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400">
                          Confirm verbally or click to finish
                        </span>
                        <button
                          type="button"
                          onClick={completeAndHandover}
                          className="py-2.5 px-5 rounded-full bg-[#182230] hover:bg-black text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Confirm & Complete Setup</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {postSummaryMessages.map((msg) => renderMessageBubble(msg))}
                </>
              );
            })()}

            {liveInterimText && (
              <div className="flex flex-col items-end animate-fadeIn">
                <div
                  className="max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tr-xs px-4 py-3 text-sm leading-relaxed bg-blue-50 text-blue-950 border border-blue-200 shadow-xs flex items-center gap-2"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <Mic className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                  <p className="italic">{liveInterimText}...</p>
                </div>
                <span className="text-[10px] text-blue-500 mt-1 px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  Transcribing live...
                </span>
              </div>
            )}

            {avatarState === "thinking" && (
              <div className="flex items-start gap-2 animate-fadeIn">
                <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 border border-slate-200 shadow-2xs flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={chatScrollBottomRef} />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 shadow-xs">
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs ${
                isMuted || !isMicAvailable
                  ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  : avatarState === "listening"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 animate-pulse"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              }`}
              title={isMuted ? "Click to unmute microphone" : "Click to mute microphone"}
            >
              {isMuted || !isMicAvailable ? (
                <MicOff className="w-4.5 h-4.5" />
              ) : (
                <Mic className="w-4.5 h-4.5" />
              )}
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={
                  isMuted || !isMicAvailable
                    ? "Type your reply here..."
                    : "Speak or type your answer..."
                }
                className="w-full pl-4 pr-11 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 shadow-2xs transition-all"
                style={{ fontFamily: "Inter, sans-serif" }}
              />

              <button
                type="submit"
                disabled={!typedInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#182230] hover:bg-black text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>
              {isMuted
                ? "Microphone muted. You can type above."
                : "Listening automatically. Speak naturally or type."}
            </span>
            <button
              type="button"
              onClick={onSwitchToTyping}
              className="text-slate-500 hover:text-blue-600 underline cursor-pointer"
            >
              Switch to typing setup
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VoiceOnboardingScreen;
