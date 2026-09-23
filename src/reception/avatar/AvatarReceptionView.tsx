/**
 * AvatarReceptionView.tsx
 * Path: src/reception/avatar/AvatarReceptionView.tsx
 *
 * Mantra AI Receptionist - Full-Screen Modern Surface
 * Strictly implements DESIGN_NAVODYA.md (v2.2 Clinical Glassmorphic System):
 * - Left Glass Sidebar (104px wide on >= 1024px, collapses to bottom bar on mobile)
 * - Two-Column Main Stage:
 *   - LEFT: Navy-to-slate gradient Aria Stage (Avatar, Live Voice Waveform, Captions)
 *   - RIGHT: Frosted White Glass Action Panel (Verification, 3-Card Visit Summary, Onboarding)
 * - 100vh Viewport, zero page scroll, synthetic data only via IMaClient
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import {
  LayoutGrid,
  CalendarCheck,
  UserPlus,
  Phone,
  CheckCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Globe,
  RotateCcw,
  Check,
  Edit3,
  X,
  ShieldCheck,
  HelpCircle,
  Volume2,
  VolumeX,
  Camera,
  ScanFace,
  Eye,
  ArrowRight,
  ArrowLeft,
  Ticket,
  ChevronRight,
  Send,
  RefreshCw,
  Mic,
  UserCheck,
  Stethoscope,
  FlaskConical,
  Building2,
  Navigation,
  Compass,
  Map,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { AnimatedAvatar, type AvatarState } from './components/AnimatedAvatar';
import { WhisperAudioRecorder } from '../lib/whisperRecorder';
import { getMaClient } from '../lib/api/maClient';
import {
  STATIC_DIRECTION_CATEGORIES,
  type PatientSummary,
  type QueueTicket,
  type ServiceItem,
  type ProviderItem,
  type VisitSummary,
  type DirectionCategory,
  type DirectionRoom,
} from '../types/reception';
import '../styles/navodyaTokens.css';
import '../styles/avatarStage.css';

export type ScreenState =
  | 'AMBIENT'
  | 'IDLE'
  | 'VERIFY_CHOICE'
  | 'FACE_CONSENT'
  | 'FACE_SCAN'
  | 'FACE_CONFIRM'
  | 'PHONE'
  | 'OTP'
  | 'PATIENT_PICK'
  | 'DETAILS_SUMMARY'
  | 'ONBOARDING_DETAILS'
  | 'ONBOARDING_FACE'
  | 'ONBOARDING_REVIEW'
  | 'SERVICE_DOCTOR'
  | 'BOOKING_CONFIRM'
  | 'TOKEN_ISSUED'
  | 'MY_VISIT'
  | 'DIRECTIONS_CATEGORIES'
  | 'DIRECTIONS_ROOMS'
  | 'DIRECTIONS_RESULT';

export type AmbientPhase = 'dormant' | 'engaged' | 'greeting' | 'listening' | 'routing';
export type FaceScanPhase = 'idle' | 'starting' | 'scanning' | 'success' | 'no_match' | 'denied';
export type FaceRegistrationPhase = 'intro' | 'capturing' | 'duplicate_found' | 'success' | 'denied';

export type FlowType = 'SCHEDULED' | 'WALK_IN' | 'PAYMENT' | 'MY_VISIT' | null;

const INACTIVITY_TIMEOUT_SECONDS = 60;

// Centralized white-label organization name config
export const DEFAULT_ORGANIZATION_NAME = 'MantraCare';
export const DEFAULT_ORGANIZATION_NAME_HI = 'मंत्राकेयर';

// Presence detection thresholds (face-size ratio proxy for distance)
// NOTE: faceHeightRatio is a heuristic proxy (face.height / video.videoHeight), not a real physical distance measurement.
// Calibration per camera lens and room geometry will be required in production.
const NOTICED_RATIO = 0.14; // Roughly a person a few steps away
const CLOSE_RATIO = 0.30;   // Heuristic proxy for under ~1 meter
const AMBIENT_DWELL_COUNT = 2; // 2 consecutive detections required to avoid flicker

// Keyword intent matcher dictionaries (English and Hindi equivalents)
const APPOINTMENT_WORDS = [
  'appointment',
  'appointments',
  'booked',
  'booking',
  'scheduled',
  'schedule',
  'check in',
  'checkin',
  'check-in',
  'my doctor',
  'my visit',
  'visit',
  'doctor',
  'dr',
  'physician',
  'cardiologist',
  'ortho',
  'orthopedic',
  'pediatrician',
  'general physician',
  'consult',
  'consultation',
  'fever',
  'cough',
  'sick',
  'pain',
  'opd',
  'meet doctor',
  'see doctor',
  'have an appointment',
  'i have appointment',
  'apointment',
  'apointmnt',
  'अपॉइंटमेंट',
  'चेक इन',
  'चेकिन',
  'बुक',
  'डॉक्टर',
  'परामर्श',
  'दिखाना',
  'तबीयत',
  'बुखार',
];

const WALKIN_WORDS = [
  'walk in',
  'walk-in',
  'walkin',
  'new patient',
  'new user',
  'new visit',
  'new visitor',
  'no appointment',
  'without appointment',
  'register',
  'registration',
  'first time',
  'first visit',
  'create account',
  'sign up',
  'enroll',
  'enrolment',
  'वॉक इन',
  'वॉक-इन',
  'नया मरीज',
  'नया पेशेंट',
  'रजिस्टर',
  'पंजीकरण',
  'पहली बार',
  'खाता',
];

const PAYMENT_WORDS = [
  'pay',
  'payment',
  'bill',
  'pay bill',
  'pay my bill',
  'invoice',
  'billing',
  'due',
  'dues',
  'fees',
  'fee',
  'counter',
  'pay dues',
  'cost',
  'charge',
  'money',
  'cashier',
  'receipt',
  'भुगतान',
  'पेमेंट',
  'बिल',
  'फीस',
  'रसीद',
  'पैसे',
];

const DIRECTIONS_WORDS = [
  'direction',
  'directions',
  'where is',
  'where are',
  'where do i',
  'how do i get to',
  'how to go',
  'way to',
  'find',
  'locate',
  'location of',
  'take me to',
  'show me',
  'show directions',
  'guide',
  'guide me',
  'map',
  'washroom',
  'restroom',
  'toilet',
  'bathroom',
  'loo',
  'lavatory',
  'wc',
  'parking',
  'pharmacy',
  'pharmacy located',
  'chemist',
  'medicine',
  'medicines',
  'medical store',
  'dispensary',
  'lab',
  'lab located',
  'laboratory',
  'diagnostic',
  'diagnostics',
  'blood test',
  'blood sample',
  'sample collection',
  'x-ray',
  'xray',
  'scan',
  'mri',
  'ultrasound',
  'pathology',
  'test',
  'reports',
  'water',
  'drinking water',
  'cooler',
  'filter',
  'help desk',
  'front desk',
  'department',
  'departments',
  'facilities',
  'lift',
  'elevator',
  'stairs',
  'cafeteria',
  'canteen',
  'दिशा',
  'कहाँ है',
  'कहाँ जाना है',
  'रास्ता',
  'वॉशरूम',
  'शौचालय',
  'टॉयलेट',
  'पार्किंग',
  'दवाखाना',
  'दवाई',
  'जाँच',
  'लैब',
  'खून जाँच',
  'टेस्ट',
  'पानी',
  'पीने का पानी',
];



export const CategoryIcon: React.FC<{ icon?: string; className?: string }> = ({
  icon,
  className = 'w-6 h-6',
}) => {
  switch (icon) {
    case 'Stethoscope':
      return <Stethoscope className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Navigation':
      return <Navigation className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Map':
      return <Map className={className} />;
    default:
      return <MapPin className={className} />;
  }
};

export interface ActionStackProps {
  primary?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'glass';
  };
  secondary?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'glass';
  };
  className?: string;
}

export const ActionStack: React.FC<ActionStackProps> = ({ primary, secondary, className = '' }) => {
  return (
    <div className={`shrink-0 flex flex-col gap-3 pt-4 w-full ${className}`}>
      {primary && (
        <button
          onClick={primary.onClick}
          disabled={primary.disabled}
          className={`w-full h-[var(--touch,60px)] min-h-[56px] px-6 rounded-full text-base font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
            primary.variant === 'glass' || primary.variant === 'secondary'
              ? 'bg-white/70 hover:bg-white/90 backdrop-blur-[16px] backdrop-saturate-[160%] border border-[#e2e8f0] border-t-white/90 shadow-[0_8px_24px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] text-[#181e25]'
              : 'bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white shadow-[0_12px_28px_rgba(20,86,240,0.40)] hover:shadow-[0_16px_36px_rgba(20,86,240,0.50)] hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          {primary.icon}
          <span>{primary.label}</span>
        </button>
      )}

      {secondary && (
        <button
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          className={`w-full h-[var(--touch,60px)] min-h-[56px] px-6 rounded-full text-base font-bold transition-all duration-200 cursor-pointer flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed ${
            secondary.variant === 'primary'
              ? 'bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white shadow-[0_12px_28px_rgba(20,86,240,0.40)]'
              : 'bg-white/70 hover:bg-white/90 backdrop-blur-[16px] backdrop-saturate-[160%] border border-[#e2e8f0] border-t-white/90 shadow-[0_8px_24px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] text-[#181e25] hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <div className="flex items-center gap-3">
            {secondary.icon}
            <span className={secondary.variant === 'primary' ? 'text-white' : 'text-[#181e25] group-hover:text-[#1456f0] transition-colors'}>
              {secondary.label}
            </span>
          </div>
          <ArrowRight
            className={`w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0 ${
              secondary.variant === 'primary' ? 'text-white' : 'text-[#1456f0]'
            }`}
          />
        </button>
      )}
    </div>
  );
};

export const AvatarReceptionView: React.FC = () => {
  const maClient = getMaClient();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Navigation & Flow State (AMBIENT is default on load/reset)
  const [screen, setScreen] = useState<ScreenState>('AMBIENT');
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi'>('en');

  // AMBIENT Presence & Greeting Sub-state Machine
  const [ambientPhase, setAmbientPhase] = useState<AmbientPhase>('dormant');
  const [ambientCameraActive, setAmbientCameraActive] = useState<boolean>(false);
  const [ambientCameraDenied, setAmbientCameraDenied] = useState<boolean>(false);
  const [ambientDisclosureVisible, setAmbientDisclosureVisible] = useState<boolean>(false);
  const ambientDisclosureShownRef = useRef<boolean>(false);
  const ambientVideoRef = useRef<HTMLVideoElement | null>(null);
  const ambientLostTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ambientPhaseRef = useRef<AmbientPhase>(ambientPhase);
  ambientPhaseRef.current = ambientPhase;
  const greetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ambientSpeechRecognitionRef = useRef<any>(null);
  const whisperRecorderRef = useRef<WhisperAudioRecorder | null>(null);
  const isAriaSpeakingRef = useRef<boolean>(false);
  const startAmbientListeningRef = useRef<(() => void) | null>(null);
  const noticedDwellRef = useRef<number>(0);
  const closeDwellRef = useRef<number>(0);
  const lastFaceSeenTimeRef = useRef<number>(0);

  // Dev-only debug overlay query parameter (?debug=1 or ?debug=true)
  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return p.get('debug') === '1' || p.get('debug') === 'true';
  }, []);

  // Avatar & Voice State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [thinkingMessage, setThinkingMessage] = useState<string>('Ready to scan...');
  const [captionText, setCaptionText] = useState<string>(
    'Welcome to MantraCare Health Center. Please touch an option to begin.'
  );
  const [userTranscriptText, setUserTranscriptText] = useState<string>('');
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Form Fields & Patient State
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [visitSummary, setVisitSummary] = useState<VisitSummary | null>(null);

  // Face Scan State Machine (Check-in flow)
  const [facePhase, setFacePhase] = useState<FaceScanPhase>('idle');
  const [facePosition, setFacePosition] = useState<'aligned' | 'too_close' | 'too_far' | 'off_center' | 'idle'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [liveHint, setLiveHint] = useState<string>("Tap Start scanning when you're ready");
  const [faceConfidence, setFaceConfidence] = useState<number>(0);
  const [faceAttempts, setFaceAttempts] = useState<number>(0);
  const [matchedCandidateName, setMatchedCandidateName] = useState<string>('Sunita');

  // Face Registration State Machine (Walk-in onboarding flow)
  const [faceRegPhase, setFaceRegPhase] = useState<FaceRegistrationPhase>('intro');
  const [regSampleIndex, setRegSampleIndex] = useState<number>(0); // 0 (Front), 1 (Left), 2 (Right)
  const [regHint, setRegHint] = useState<string>('Look straight');
  const [regAttempts, setRegAttempts] = useState<number>(0);
  const [duplicateCandidate, setDuplicateCandidate] = useState<PatientSummary | null>(null);
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);

  // Toast message state (in-panel glass notification)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimer1Ref = useRef<NodeJS.Timeout | null>(null);
  const hintTimer2Ref = useRef<NodeJS.Timeout | null>(null);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const regStepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const screenRef = useRef<ScreenState>(screen);
  screenRef.current = screen;
  const processDirectionsIntentRef = useRef<((transcript: string, options?: { isAmbient?: boolean }) => Promise<boolean>) | null>(null);
  const resolveIntentRef = useRef<((transcript: string, options?: { isAmbient?: boolean }) => Promise<boolean>) | null>(null);

  const lastActivityTimeRef = useRef<number>(Date.now());

  // Dynamic Alignment state & hint text
  const isAligned = facePosition === 'aligned';

  const dynamicHintText = useMemo(() => {
    if (facePosition === 'too_close') return 'Move back a little';
    if (facePosition === 'too_far') return 'Move closer';
    if (facePosition === 'off_center') return 'Center your face';
    if (facePosition === 'aligned') return 'Hold still';
    if (facePhase === 'starting') return 'Starting scan, get ready...';
    if (facePhase === 'scanning') return liveHint;
    return "Tap Start scanning when you're ready";
  }, [facePosition, facePhase, liveHint]);

  // Real-time Face Detection Loop: Only runs on FACE_SCAN and throttled to ~8 fps (125ms)
  useEffect(() => {
    if (screen !== 'FACE_SCAN') return;

    let animationFrameId: number;
    let detector: any = null;
    let lastFrameTime = 0;

    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (e) {
        console.warn('Native FaceDetector initialization failed:', e);
      }
    }

    const checkFace = async (time: number) => {
      if (time - lastFrameTime >= 125) {
        lastFrameTime = time;
        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          videoRef.current.videoWidth > 0 &&
          (facePhase === 'idle' || facePhase === 'scanning')
        ) {
          if (detector) {
            try {
              const faces = await detector.detect(videoRef.current);
              if (faces && faces.length > 0) {
                const face = faces[0].boundingBox;
                const vW = videoRef.current.videoWidth;
                const vH = videoRef.current.videoHeight;
                const faceW = face.width / vW;
                const faceH = face.height / vH;
                const faceCenterX = (face.x + face.width / 2) / vW;
                const faceCenterY = (face.y + face.height / 2) / vH;
                const centerDistX = Math.abs(faceCenterX - 0.5);
                const centerDistY = Math.abs(faceCenterY - 0.5);

                if (faceW > 0.65 || faceH > 0.75) {
                  setFacePosition('too_close');
                } else if (faceW < 0.22 || faceH < 0.26) {
                  setFacePosition('too_far');
                } else if (centerDistX > 0.16 || centerDistY > 0.16) {
                  setFacePosition('off_center');
                } else {
                  setFacePosition('aligned');
                }
              }
            } catch {}
          }
        }
      }
      animationFrameId = requestAnimationFrame(checkFace);
    };

    animationFrameId = requestAnimationFrame(checkFace);
    return () => cancelAnimationFrame(animationFrameId);
  }, [screen, facePhase]);

  // New Patient Onboarding State
  const [onboardingForm, setOnboardingForm] = useState<{
    name: string;
    dob: string;
    age: number;
    gender: string;
    email: string;
    reason: string;
    faceCheckinNextTime: boolean;
    faceConsentAt?: string;
    capturedTemplate?: number[];
  }>({
    name: '',
    dob: '',
    age: 34,
    gender: 'Female',
    email: '',
    reason: 'General Consultation',
    faceCheckinNextTime: false,
  });

  // Booking & Services State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('srv_consult');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('next_available');

  // Issued Token & Feedback
  const [issuedTicket, setIssuedTicket] = useState<QueueTicket | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactivitySeconds, setInactivitySeconds] = useState<number | null>(null);

  // Directions & Wayfinding State
  const [directionCategories, setDirectionCategories] = useState<DirectionCategory[]>(STATIC_DIRECTION_CATEGORIES);
  const [selectedDirectionCategory, setSelectedDirectionCategory] = useState<DirectionCategory | null>(null);
  const [selectedDirectionRoom, setSelectedDirectionRoom] = useState<DirectionRoom | null>(null);
  const [directionsEntrySource, setDirectionsEntrySource] = useState<'browse' | 'voice_direct'>('browse');

  const loadDirectionCategories = useCallback(async () => {
    try {
      const cats = await maClient.getDirectionCategories();
      if (cats && cats.length > 0) {
        setDirectionCategories(cats);
        return cats;
      }
      return STATIC_DIRECTION_CATEGORIES;
    } catch (e) {
      console.warn('Using static direction categories fallback:', e);
      return STATIC_DIRECTION_CATEGORIES;
    }
  }, [maClient]);

  useEffect(() => {
    loadDirectionCategories();
  }, [loadDirectionCategories]);

  // URL Route Synchronization
  useEffect(() => {
    const pathname = location.pathname;

    if (
      pathname === '/reception' ||
      pathname === '/reception/' ||
      pathname === '/reception/avatar' ||
      pathname === '/reception/landing' ||
      pathname === '/reception/idle'
    ) {
      if (pathname === '/reception/landing' || pathname === '/reception/idle') {
        navigate('/reception', { replace: true });
      }
      if (screen !== 'AMBIENT') {
        setScreen('AMBIENT');
        setFlowType(null);
      }
    } else if (pathname === '/reception/appointment') {
      setFlowType('SCHEDULED');
      if (screen === 'AMBIENT' || screen === 'IDLE' || screen.startsWith('DIRECTIONS') || screen === 'MY_VISIT') {
        setScreen('FACE_SCAN');
      }
    } else if (pathname === '/reception/walk-in') {
      setFlowType('WALK_IN');
      if (screen === 'AMBIENT' || screen === 'IDLE' || screen.startsWith('DIRECTIONS') || screen === 'MY_VISIT') {
        setScreen('PHONE');
      }
    } else if (pathname.startsWith('/reception/billing')) {
      setFlowType('PAYMENT');
      if (screen === 'AMBIENT' || screen === 'IDLE' || screen.startsWith('DIRECTIONS') || screen === 'MY_VISIT') {
        setScreen('PHONE');
      }
    } else if (pathname === '/reception/directions') {
      setScreen('DIRECTIONS_CATEGORIES');
      setFlowType(null);
    } else if (pathname.startsWith('/reception/directions/')) {
      const parts = pathname.replace('/reception/directions/', '').split('/');
      const catId = parts[0];
      const roomId = parts[1];

      const resolveRouteCategoryAndRoom = async () => {
        const cats = directionCategories.length > 0 ? directionCategories : await loadDirectionCategories();
        const foundCat = cats.find((c) => c.id === catId);
        if (foundCat) {
          setSelectedDirectionCategory(foundCat);
          if (roomId) {
            const foundRoom = foundCat.rooms.find((r) => r.id === roomId);
            if (foundRoom) {
              setSelectedDirectionRoom(foundRoom);
              setScreen('DIRECTIONS_RESULT');
            } else {
              setScreen('DIRECTIONS_ROOMS');
            }
          } else {
            setScreen('DIRECTIONS_ROOMS');
          }
        } else {
          setScreen('DIRECTIONS_CATEGORIES');
        }
      };

      resolveRouteCategoryAndRoom();
    } else if (pathname === '/reception/my-visit') {
      setFlowType('MY_VISIT');
      setScreen('MY_VISIT');
    }
  }, [location.pathname, directionCategories, loadDirectionCategories]);

  // Trigger in-panel glass toast
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Load clinic services and providers
  useEffect(() => {
    maClient.getServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedServiceId) {
      maClient.getProviders(undefined, selectedServiceId).then(setProviders).catch(console.error);
    } else {
      maClient.getProviders().then(setProviders).catch(console.error);
    }
  }, [selectedServiceId]);

  // Voice synthesis: Prioritized Female Voice Selection & Caching
  const cachedVoicesRef = useRef<Record<string, SpeechSynthesisVoice | null>>({});

  const getFemaleVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    if (cachedVoicesRef.current[lang]) {
      return cachedVoicesRef.current[lang];
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetLangPrefix = lang === 'hi' ? 'hi' : lang === 'es' ? 'es' : 'en';
    const matchingLangVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetLangPrefix));

    const preferences: Record<string, string[]> = {
      en: [
        'Google US English Female',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Zira - English (United States)',
        'Microsoft Zira Desktop - English (United States)',
        'Samantha',
        'Victoria',
        'Karen',
        'Moira',
        'Fiona',
        'Tessa',
        'Google UK English Female',
        'en-US-Standard-C',
        'en-US-Wavenet-C',
        'en-US-Wavenet-F',
        'Aria',
        'Jenny',
        'Zira',
      ],
      hi: [
        'Google हिन्दी',
        'Microsoft Swara Online (Natural) - Hindi (India)',
        'Microsoft Heera - Hindi (India)',
        'Kalpana',
        'Swara',
        'Heera',
        'hi-IN-Standard-A',
        'hi-IN-Wavenet-A',
      ],
      es: [
        'Google español',
        'Microsoft Laura Online (Natural) - Spanish (Spain)',
        'Microsoft Helena - Spanish (Spain)',
        'Paulina',
        'Monica',
        'Laura',
        'Helena',
      ],
    };

    const prefs = preferences[lang] || preferences.en;

    // 1. Check exact or substring match in preferences
    for (const pref of prefs) {
      const found = matchingLangVoices.find(
        (v) => v.name.toLowerCase() === pref.toLowerCase() || v.name.toLowerCase().includes(pref.toLowerCase())
      );
      if (found) {
        cachedVoicesRef.current[lang] = found;
        console.log(`[TTS] Selected preferred female voice for '${lang}': ${found.name}`);
        return found;
      }
    }

    // 2. Keyword heuristic search for "female", "woman", "natural"
    const femaleKeywordVoice = matchingLangVoices.find(
      (v) =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('woman') ||
        v.name.toLowerCase().includes('natural')
    );
    if (femaleKeywordVoice) {
      cachedVoicesRef.current[lang] = femaleKeywordVoice;
      console.log(`[TTS] Selected keyword female voice for '${lang}': ${femaleKeywordVoice.name}`);
      return femaleKeywordVoice;
    }

    // 3. Fallback to first matching language voice
    if (matchingLangVoices.length > 0) {
      cachedVoicesRef.current[lang] = matchingLangVoices[0];
      console.warn(`[TTS] No clearly-female voice found for '${lang}', falling back to: ${matchingLangVoices[0].name}`);
      return matchingLangVoices[0];
    }

    if (voices.length > 0) {
      cachedVoicesRef.current[lang] = voices[0];
      return voices[0];
    }

    return null;
  }, []);

  // Initialize voices on mount & listen to voiceschanged
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        getFemaleVoice('en');
        getFemaleVoice('hi');
        getFemaleVoice('es');
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
  }, [getFemaleVoice]);

  // Voice synthesis & live captioning
  const speak = useCallback(
    (
      text: string,
      state: AvatarState = 'speaking',
      thinkMsg?: string,
      onEnd?: () => void
    ) => {
      setCaptionText(text);
      setUserTranscriptText('');
      setIsUserSpeaking(false);
      if (thinkMsg) setThinkingMessage(thinkMsg);
      setAvatarState(state);
      console.log(`[Aria Speaking 🗣️]: "${text}"`);

      if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
        if (state === 'speaking') {
          isAriaSpeakingRef.current = true;
          setTimeout(() => {
            isAriaSpeakingRef.current = false;
            setAvatarState('idle');
            onEnd?.();
          }, 2400);
        } else {
          isAriaSpeakingRef.current = false;
          onEnd?.();
        }
        return;
      }

      try {
        if (ambientSpeechRecognitionRef.current) {
          try {
            ambientSpeechRecognitionRef.current.stop();
          } catch {}
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.06;

        const voice = getFemaleVoice(currentLanguage);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
        }

        utterance.onstart = () => {
          isAriaSpeakingRef.current = true;
          setAvatarState('speaking');
        };
        utterance.onend = () => {
          isAriaSpeakingRef.current = false;
          if (state !== 'success' && state !== 'thinking') {
            setAvatarState('idle');
          }
          // Small 150ms acoustic buffer before triggering next step
          setTimeout(() => {
            onEnd?.();
          }, 150);
        };
        utterance.onerror = () => {
          isAriaSpeakingRef.current = false;
          if (state !== 'success' && state !== 'thinking') {
            setAvatarState('idle');
          }
          setTimeout(() => {
            onEnd?.();
          }, 150);
        };

        isAriaSpeakingRef.current = true;
        window.speechSynthesis.speak(utterance);
      } catch {
        isAriaSpeakingRef.current = false;
        setAvatarState('idle');
        onEnd?.();
      }
    },
    [isMuted, currentLanguage, getFemaleVoice]
  );

  // Dictation state for New Patient Details
  const [activeDictationField, setActiveDictationField] = useState<'name' | 'reason' | null>(null);
  const [dictationSuccessField, setDictationSuccessField] = useState<'name' | 'reason' | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const dictationTimeoutRef = useRef<any>(null);

  const isSpeechRecognitionSupported = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }, []);

  const startDictation = useCallback(
    (field: 'name' | 'reason') => {
      if (typeof window === 'undefined') return;
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) return;

      if (activeDictationField === field) {
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {}
        }
        if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current);
        setActiveDictationField(null);
        return;
      }

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
      if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current);

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setActiveDictationField(field);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript || '';
          if (transcript) {
            setOnboardingForm((prev) => ({
              ...prev,
              [field]: transcript.trim(),
            }));
            setDictationSuccessField(field);
            setTimeout(() => {
              setDictationSuccessField(null);
            }, 1500);
          }
          setActiveDictationField(null);
        };

        recognition.onerror = () => {
          setActiveDictationField(null);
        };

        recognition.onend = () => {
          setActiveDictationField(null);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();

        dictationTimeoutRef.current = setTimeout(() => {
          try {
            recognition.stop();
          } catch {}
          setActiveDictationField(null);
        }, 10000);
      } catch {
        setActiveDictationField(null);
      }
    },
    [activeDictationField, currentLanguage]
  );

  // Clear all scan timers and ambient timers
  const clearAllScanTimers = useCallback(() => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (hintTimer1Ref.current) clearTimeout(hintTimer1Ref.current);
    if (hintTimer2Ref.current) clearTimeout(hintTimer2Ref.current);
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    if (regStepTimerRef.current) clearTimeout(regStepTimerRef.current);
    if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    if (ambientLostTimerRef.current) clearTimeout(ambientLostTimerRef.current);
    if (whisperRecorderRef.current) {
      whisperRecorderRef.current.stop();
      whisperRecorderRef.current = null;
    }
    if (ambientSpeechRecognitionRef.current) {
      try {
        ambientSpeechRecognitionRef.current.stop();
      } catch {}
      ambientSpeechRecognitionRef.current = null;
    }
  }, []);

  // Stop active camera stream
  const stopCameraStream = useCallback(() => {
    clearAllScanTimers();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (ambientVideoRef.current) {
      ambientVideoRef.current.srcObject = null;
    }
    setAmbientCameraActive(false);
  }, [clearAllScanTimers]);

  // Start active camera preview
  const startCameraPreview = useCallback(async () => {
    if (streamRef.current && streamRef.current.active) {
      if (screen === 'AMBIENT') {
        if (ambientVideoRef.current && ambientVideoRef.current.srcObject !== streamRef.current) {
          ambientVideoRef.current.srcObject = streamRef.current;
          ambientVideoRef.current.play().catch(() => {});
        }
        setAmbientCameraActive(true);
      } else {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }
      return;
    }

    if (screen === 'AMBIENT' && ambientCameraDenied) {
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        streamRef.current = stream;

        if (screen === 'AMBIENT') {
          if (ambientVideoRef.current) {
            ambientVideoRef.current.srcObject = stream;
            ambientVideoRef.current.play().catch(() => {});
          }
          setAmbientCameraActive(true);
          // Show one-time 4s session privacy disclosure toast
          if (!ambientDisclosureShownRef.current) {
            ambientDisclosureShownRef.current = true;
            setAmbientDisclosureVisible(true);
            setTimeout(() => {
              setAmbientDisclosureVisible(false);
            }, 4000);
          }
        } else {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
      } else {
        throw new Error('Camera device or getUserMedia not available');
      }
    } catch (e) {
      console.warn('Camera preview unavailable:', e);
      stopCameraStream();

      if (screen === 'AMBIENT') {
        // AMBIENT remains gracefully in touch-only dormant mode permanently (no error prompt)
        setAmbientCameraDenied(true);
        setAmbientCameraActive(false);
      } else if (screen === 'ONBOARDING_FACE') {
        setFaceRegPhase('denied');
        speak(
          currentLanguage === 'hi'
            ? 'कैमरा उपलब्ध नहीं है। आप बिना चेहरा पंजीकरण के जारी रख सकते हैं।'
            : 'Camera access was unavailable. You can continue registration without face check-in.',
          'apologetic'
        );
      } else {
        setFacePhase('denied');
        setScreen('PHONE');
        setErrorMessage('Camera access was unavailable. Please check in with your phone number.');
        speak(
          currentLanguage === 'hi'
            ? 'कैमरा उपलब्ध नहीं है। कृपया फोन नंबर का उपयोग करें।'
            : 'Camera access was unavailable. Please check in with your phone number.',
          'apologetic'
        );
      }
    }
  }, [stopCameraStream, speak, currentLanguage, screen, ambientCameraDenied]);

  // Hook to start/stop live camera preview based on active screen
  useEffect(() => {
    const isCameraScreen =
      screen === 'AMBIENT' ||
      screen === 'FACE_SCAN' ||
      screen === 'FACE_CONSENT' ||
      (screen === 'ONBOARDING_FACE' && faceRegPhase === 'capturing');

    if (isCameraScreen) {
      startCameraPreview();
    } else {
      stopCameraStream();
    }
  }, [screen, faceRegPhase, startCameraPreview, stopCameraStream]);

  // Ensure video elements receive active stream upon rendering
  useEffect(() => {
    if (screen === 'AMBIENT') {
      if (ambientVideoRef.current && streamRef.current && ambientVideoRef.current.srcObject !== streamRef.current) {
        ambientVideoRef.current.srcObject = streamRef.current;
        ambientVideoRef.current.play().catch(() => {});
      }
    } else {
      if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [screen, facePhase, ambientPhase]);

  // Speech listening and keyword intent resolver for AMBIENT screen
  const ambientListeningTimeoutRef = useRef<any>(null);
  const unrecognizedAttemptsRef = useRef<number>(0);

  const startAmbientListening = useCallback(() => {
    if (screenRef.current !== 'AMBIENT') return;
    if (typeof window === 'undefined') return;

    // Delay start if Aria is actively speaking to prevent mic picking up speaker output
    if (isAriaSpeakingRef.current) {
      setTimeout(() => {
        if (screenRef.current === 'AMBIENT') {
          startAmbientListening();
        }
      }, 300);
      return;
    }

    setAmbientPhase('listening');
    setAvatarState('idle');

    if (ambientListeningTimeoutRef.current) {
      clearTimeout(ambientListeningTimeoutRef.current);
      ambientListeningTimeoutRef.current = null;
    }

    // Stop any previously active whisper recorder or speech recognition
    if (whisperRecorderRef.current) {
      whisperRecorderRef.current.stop();
      whisperRecorderRef.current = null;
    }

    let intentHandled = false;

    // 1. Primary Engine: Neural Whisper STT via /api/stt/transcribe
    try {
      const whisperRecorder = new WhisperAudioRecorder({
        language: currentLanguage === 'hi' ? 'hi' : 'en',
        onAudioLevel: (level: number) => {
          if (level > 0.05 && !isAriaSpeakingRef.current) {
            setIsUserSpeaking(true);
          }
        },
        onTranscript: async (transcript: string) => {
          if (isAriaSpeakingRef.current || intentHandled) return;

          const normalizedLower = transcript.toLowerCase();
          const isEcho =
            normalizedLower.includes('how can i help') ||
            normalizedLower.includes('welcome to mantracare') ||
            normalizedLower.includes('welcome to mantra care') ||
            normalizedLower.includes('help you today') ||
            normalizedLower.includes("didn't quite catch") ||
            normalizedLower.includes('didnt quite catch') ||
            normalizedLower.includes('tap an option') ||
            normalizedLower.includes('tell me what you need') ||
            normalizedLower.includes('माफ़ कीजिए') ||
            normalizedLower.includes('नमस्ते') ||
            normalizedLower.includes('सहायता कर सकती');

          if (isEcho) {
            console.log('[Whisper STT] Ignored system voice echo:', transcript);
            setIsUserSpeaking(false);
            return;
          }

          console.log(`[User Spoke 🗣️]: "${transcript}"`);
          setUserTranscriptText(transcript);
          setIsUserSpeaking(false);
          intentHandled = true;
          setAmbientPhase('routing');
          whisperRecorder.stop();
          stopCameraStream();

          setTimeout(async () => {
            if (resolveIntentRef.current) {
              await resolveIntentRef.current(transcript, { isAmbient: true });
            }
          }, 80);
        },
        onError: (err) => {
          console.warn('[Whisper STT] Recorder notice:', err);
          setIsUserSpeaking(false);
        },
      });

      whisperRecorder.start().catch((err) => {
        console.warn('[Whisper STT] Could not start audio stream:', err);
      });
      whisperRecorderRef.current = whisperRecorder;
    } catch (err) {
      console.warn('[Whisper STT] Init failed:', err);
    }

    // Reset to dormant if no speech heard within 16 seconds
    ambientListeningTimeoutRef.current = setTimeout(() => {
      if (!intentHandled && screenRef.current === 'AMBIENT' && ambientPhaseRef.current === 'listening') {
        whisperRecorderRef.current?.stop();
        setAmbientPhase('dormant');
      }
    }, 16000);
  }, [currentLanguage, stopCameraStream]);
  startAmbientListeningRef.current = startAmbientListening;

  // Presence Trigger Flow on AMBIENT screen (Button tap OR close face auto-detection)
  // Sequence: dormant -> engaged (300-500ms attentive pose) -> greeting (TTS welcome) -> listening (chained onend) -> routing -> destination
  const triggerPresenceFlow = useCallback(() => {
    if (
      ambientPhaseRef.current === 'engaged' ||
      ambientPhaseRef.current === 'greeting'
    ) {
      return;
    }

    if (ambientListeningTimeoutRef.current) {
      clearTimeout(ambientListeningTimeoutRef.current);
      ambientListeningTimeoutRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ambientSpeechRecognitionRef.current) {
      try {
        ambientSpeechRecognitionRef.current.stop();
      } catch {}
      ambientSpeechRecognitionRef.current = null;
    }

    // Step 1: Engaged (brief alert / attentive pose shift, ~300ms)
    unrecognizedAttemptsRef.current = 0;
    setAmbientPhase('engaged');
    setAvatarState('idle');

    if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    greetingTimerRef.current = setTimeout(() => {
      if (screenRef.current !== 'AMBIENT') return;

      // Step 2: Greeting (Speak welcome with white-label organization name)
      setAmbientPhase('greeting');
      const orgName = currentLanguage === 'hi' ? DEFAULT_ORGANIZATION_NAME_HI : DEFAULT_ORGANIZATION_NAME;
      const greetingText =
        currentLanguage === 'hi'
          ? `नमस्ते, ${orgName} में आपका स्वागत है! मैं आज आपकी क्या सहायता कर सकती हूँ?`
          : `Welcome to ${orgName}! How can I help you today?`;

      let hasChainedToListening = false;
      const onGreetingFinished = () => {
        if (hasChainedToListening) return;
        hasChainedToListening = true;
        if (screenRef.current === 'AMBIENT') {
          // Step 3: Listening immediately chained off TTS completion with 200ms buffer
          setTimeout(() => {
            if (screenRef.current === 'AMBIENT') {
              setAmbientPhase('listening');
              startAmbientListening();
            }
          }, 200);
        }
      };

      speak(greetingText, 'speaking', undefined, onGreetingFinished);
    }, 300);
  }, [currentLanguage, speak, startAmbientListening]);

  // Presence Detection Loop: Only runs on AMBIENT (Throttled ~5 FPS / 200ms)
  // Bounding-box numbers stay strictly in memory and are discarded immediately after calculation.
  useEffect(() => {
    if (screen !== 'AMBIENT' || ambientCameraDenied) {
      if (ambientLostTimerRef.current) {
        clearTimeout(ambientLostTimerRef.current);
        ambientLostTimerRef.current = null;
      }
      return;
    }

    let animationFrameId: number;
    let detector: any = null;
    let lastFrameTime = 0;

    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (e) {
        console.warn('Native FaceDetector initialization failed:', e);
      }
    }

    // If FaceDetector is not available in window, presence detection is gracefully disabled (manual button is primary)
    if (!detector) {
      return;
    }

    const checkAmbientPresence = async (time: number) => {
      if (time - lastFrameTime >= 200) {
        lastFrameTime = time;

        const vid = ambientVideoRef.current;
        if (
          vid &&
          vid.readyState >= 2 &&
          vid.videoHeight > 0 &&
          screenRef.current === 'AMBIENT' &&
          ambientPhaseRef.current === 'dormant'
        ) {
          try {
            const faces = await detector.detect(vid);
            if (faces && faces.length > 0) {
              const face = faces[0].boundingBox;
              const vH = vid.videoHeight || 720;
              const faceHeightRatio = face.height / vH;
              lastFaceSeenTimeRef.current = Date.now();

              if (ambientLostTimerRef.current) {
                clearTimeout(ambientLostTimerRef.current);
                ambientLostTimerRef.current = null;
              }

              if (faceHeightRatio >= CLOSE_RATIO) {
                closeDwellRef.current += 1;
                if (closeDwellRef.current >= AMBIENT_DWELL_COUNT) {
                  triggerPresenceFlow();
                }
              } else {
                closeDwellRef.current = 0;
              }
            } else {
              closeDwellRef.current = 0;
            }
          } catch {
            // Discard detection errors gracefully
          }
        }
      }
      animationFrameId = requestAnimationFrame(checkAmbientPresence);
    };

    animationFrameId = requestAnimationFrame(checkAmbientPresence);
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (ambientLostTimerRef.current) {
        clearTimeout(ambientLostTimerRef.current);
        ambientLostTimerRef.current = null;
      }
    };
  }, [screen, ambientCameraDenied, triggerPresenceFlow]);

  // Expose test hooks for AMBIENT and face position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setFacePosition = (pos: 'aligned' | 'too_close' | 'too_far' | 'off_center' | 'idle') => {
        setFacePosition(pos);
      };
      (window as any).__triggerPresence = () => {
        triggerPresenceFlow();
      };
      (window as any).__setAmbientPhase = (phase: AmbientPhase) => {
        setAmbientPhase(phase);
        if (phase === 'engaged' || phase === 'greeting') {
          triggerPresenceFlow();
        } else if (phase === 'listening') {
          startAmbientListening();
        }
      };
      (window as any).__triggerAmbientIntent = async (phrase: string) => {
        const text = phrase.trim();
        console.log(`[Voice Intent] Raw Recognized Text (manual trigger): "${text}"`);
        setAmbientPhase('routing');
        setTimeout(async () => {
          stopCameraStream();
          if (resolveIntentRef.current) {
            await resolveIntentRef.current(text, { isAmbient: true });
          }
        }, 500);
      };
    }
  }, [triggerPresenceFlow, startAmbientListening, stopCameraStream]);

  // Cancel scanning & reset to idle preview
  const cancelScanning = useCallback(() => {
    clearAllScanTimers();
    setFacePhase('idle');
    setLiveHint("Tap Start scanning when you're ready");
    speak(
      currentLanguage === 'hi'
        ? 'जब आप तैयार हों तो स्टार्ट स्कैनिंग पर टैप करें।'
        : "Tap Start scanning when you're ready to check in.",
      'idle'
    );
  }, [clearAllScanTimers, speak, currentLanguage]);

  // Triggered when patient taps "Start scanning"
  const startScanning = useCallback(async () => {
    clearAllScanTimers();
    setFacePhase('starting');
    setCountdown(3);
    setLiveHint('Starting scan, get ready...');
    speak(
      currentLanguage === 'hi'
        ? 'स्कैन शुरू हो रहा है, तैयार रहें...'
        : 'Starting scan, get ready...',
      'thinking'
    );

    // Ensure live preview stream is running
    if (!streamRef.current || !streamRef.current.active) {
      await startCameraPreview();
    }

    // 3-2-1 Countdown
    let currentCount = 3;
    countdownTimerRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        // Begin scanning
        setFacePhase('scanning');
        setLiveHint('Move a little closer');
        speak(
          currentLanguage === 'hi'
            ? 'कृपया चेहरे को फ्रेम में रखें और स्थिर रहें...'
            : 'Hold still, looking up your clinic appointment...',
          'speaking',
          'Scanning face template...'
        );

        // Hint 1: Center face
        hintTimer1Ref.current = setTimeout(() => {
          setLiveHint('Center your face in the oval');
        }, 1800);

        // Hint 2: Hold still
        hintTimer2Ref.current = setTimeout(() => {
          setLiveHint('Hold still, almost done');
        }, 3200);

        // Auto-timeout after 8s if no match
        scanTimeoutRef.current = setTimeout(() => {
          setFaceAttempts((prev) => prev + 1);
          setFacePhase('no_match');
          speak(
            currentLanguage === 'hi'
              ? 'समय समाप्त। कृपया पुनः प्रयास करें या फोन नंबर का उपयोग करें।'
              : "I couldn't match an appointment with this scan. You can try again or use your phone number.",
            'apologetic'
          );
        }, 8000);

        // Vector template matching at ~4.5s
        matchTimerRef.current = setTimeout(async () => {
          if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

          const capturedVector = [0.38, 0.74, 0.22, 0.91, 0.55, 0.18, 0.63, 0.87];
          const matchResult = await maClient.matchFaceTemplate(capturedVector, 0.70);

          if (matchResult.matched && matchResult.client) {
            setSelectedPatient(matchResult.client);
            setFaceConfidence(matchResult.confidence);
            const firstName = matchResult.client.name.split(' ')[0] || 'Sunita';
            setMatchedCandidateName(firstName);
            setFacePhase('success');
            setLiveHint('Face verified!');
            speak(
              currentLanguage === 'hi'
                ? `नमस्ते ${firstName}! क्या आप यही हैं?`
                : `Hi ${firstName}! Is this you? Please confirm to view your visit summary.`,
              'success'
            );
          } else {
            setFaceAttempts((prev) => prev + 1);
            setFacePhase('no_match');
            speak(
              currentLanguage === 'hi'
                ? 'कोई अपॉइंटमेंट नहीं मिला। कृपया पुनः प्रयास करें।'
                : "I couldn't match an appointment with this scan. You can try again or use your phone number.",
              'apologetic'
            );
          }
        }, 4500);
      }
    }, 1000);
  }, [clearAllScanTimers, speak, currentLanguage, startCameraPreview, maClient]);

  // Reset Session (Always returns to AMBIENT screen)
  const handleResetSession = useCallback((param?: boolean | React.MouseEvent) => {
    const skipSpeechIfAmbient = typeof param === 'boolean' ? param : false;
    clearAllScanTimers();
    stopCameraStream();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const wasAmbient = screenRef.current === 'AMBIENT';

    setScreen('AMBIENT');
    setAmbientPhase('dormant');
    setFlowType(null);
    setFacePhase('idle');
    setFaceRegPhase('intro');
    setRegSampleIndex(0);
    setRegAttempts(0);
    setDuplicateCandidate(null);
    setCountdown(3);
    setLiveHint("Tap Start scanning when you're ready");
    setPhoneNumber('');
    setOtp('');
    setSessionToken('');
    setPatients([]);
    setSelectedPatient(null);
    setVisitSummary(null);
    setIssuedTicket(null);
    setFaceAttempts(0);
    setFaceConfidence(0);
    setStaffModalOpen(false);
    setErrorMessage(null);
    setInactivitySeconds(null);
    setSelectedServiceId('');
    setSelectedProviderId('next_available');
    setSelectedDirectionCategory(null);
    setSelectedDirectionRoom(null);
    setDirectionsEntrySource('browse');
    setOnboardingForm({
      name: '',
      dob: '',
      age: 34,
      gender: 'Female',
      email: '',
      reason: 'General Consultation',
      faceCheckinNextTime: false,
    });

    if (!(skipSpeechIfAmbient && wasAmbient)) {
      setCaptionText(
        currentLanguage === 'hi'
          ? 'मंत्राकेयर में आपका स्वागत है। शुरू करने के लिए कृपया एक विकल्प चुनें।'
          : 'Welcome to MantraCare Health Center. Please touch an option to begin.'
      );
    }

    if (location.pathname !== '/reception') {
      navigate('/reception');
    }
  }, [stopCameraStream, currentLanguage, clearAllScanTimers, location.pathname, navigate]);

  // Throttled User Activity Handler (at most 1 call/sec)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityTimeRef.current < 1000) return;
    lastActivityTimeRef.current = now;
    setInactivitySeconds(INACTIVITY_TIMEOUT_SECONDS);
  }, []);

  // Single dedicated interval for 60s inactivity countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsed);
      setInactivitySeconds(remaining);

      if (remaining === 0) {
        if (screenRef.current !== 'AMBIENT' || location.pathname !== '/reception') {
          handleResetSession(true);
        }
        lastActivityTimeRef.current = Date.now();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [handleResetSession, location.pathname]);

  // Global user activity event listeners (throttled)
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart'];
    const listener = () => handleUserActivity();
    events.forEach((evt) => window.addEventListener(evt, listener, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, listener));
    };
  }, [handleUserActivity]);

  // Navigation Handlers
  const handleNavClick = (
    target: 'home' | 'checkin' | 'new_patient' | 'payment' | 'directions' | 'my_visit' | 'lang' | 'staff'
  ) => {
    handleUserActivity();
    if (target === 'home') {
      handleResetSession();
    } else if (target === 'checkin') {
      stopCameraStream();
      setFlowType('SCHEDULED');
      setScreen('FACE_SCAN');
      navigate('/reception/appointment');
      speak(
        currentLanguage === 'hi'
          ? 'कृपया चेक इन करने के लिए कैमरे में देखें या फोन नंबर दर्ज करें।'
          : 'Please look into the camera to check in, or use your phone number below.'
      );
    } else if (target === 'new_patient') {
      stopCameraStream();
      setFlowType('WALK_IN');
      setScreen('PHONE');
      navigate('/reception/walk-in');
      speak(
        currentLanguage === 'hi'
          ? 'स्वागत है! पंजीकरण शुरू करने के लिए अपना फोन नंबर दर्ज करें।'
          : 'Welcome! Please enter your mobile phone number on the touch keypad to begin registration.'
      );
    } else if (target === 'payment') {
      stopCameraStream();
      setFlowType('PAYMENT');
      setScreen('PHONE');
      navigate('/reception/billing');
      speak(
        currentLanguage === 'hi'
          ? 'कृपया अपना बिल और बकाया देखने के लिए अपना मोबाइल नंबर दर्ज करें।'
          : 'Please enter your mobile phone number on the touch keypad to look up your bill.'
      );
    } else if (target === 'directions') {
      handleOpenDirections();
    } else if (target === 'my_visit') {
      stopCameraStream();
      setFlowType('MY_VISIT');
      navigate('/reception/my-visit');
      loadMyVisitStatus();
    } else if (target === 'lang') {
      const nextLang = currentLanguage === 'en' ? 'hi' : 'en';
      setCurrentLanguage(nextLang);
      speak(
        nextLang === 'hi'
          ? 'भाषा बदलकर हिंदी कर दी गई है।'
          : 'Language changed to English.'
      );
    } else if (target === 'staff') {
      setStaffModalOpen(true);
      speak('Front desk staff have been notified and someone is coming to assist you.');
    }
  };

  // Privacy gate confirmation
  const handleFaceConfirmYes = async () => {
    handleUserActivity();
    if (!selectedPatient) return;
    speak('Loading your visit summary...', 'thinking', 'Retrieving appointment & room details...');
    const summary = await maClient.getVisitSummary(selectedPatient.id);
    setVisitSummary(summary);
    setScreen('DETAILS_SUMMARY');
    speak(
      `Welcome ${selectedPatient.name}. Your appointment for ${summary.appointment.serviceName} is assigned to ${summary.room.roomName}. Please confirm check-in.`,
      'speaking'
    );
  };

  const handleFaceConfirmNo = () => {
    handleUserActivity();
    setSelectedPatient(null);
    cancelScanning();
  };

  // --- FLOW 2: Phone & OTP Verification ---
  const startPhoneVerification = () => {
    handleUserActivity();
    setScreen('PHONE');
    speak('Please enter your mobile phone number on the touch keypad.');
  };

  const handleKeypadPress = (digit: string) => {
    handleUserActivity();
    setErrorMessage(null);
    if (digit === 'BACK') {
      setPhoneNumber((prev) => prev.slice(0, -1));
    } else if (digit === 'CLEAR') {
      setPhoneNumber('');
    } else {
      if (phoneNumber.length < 15) {
        setPhoneNumber((prev) => prev + digit);
      }
    }
  };

  const handleOtpPress = (digit: string) => {
    handleUserActivity();
    setErrorMessage(null);
    if (digit === 'BACK') {
      setOtp((prev) => prev.slice(0, -1));
    } else if (digit === 'CLEAR') {
      setOtp('');
    } else {
      if (otp.length < 4) {
        const nextOtp = otp + digit;
        setOtp(nextOtp);
        if (nextOtp.length === 4) {
          verifyOtp(nextOtp);
        }
      }
    }
  };

  const handleSendOtp = async () => {
    handleUserActivity();
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
      setErrorMessage('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    setErrorMessage(null);
    speak('Sending security code...', 'thinking', 'Sending SMS OTP...');
    try {
      await maClient.sendOtp(phoneNumber);
      setScreen('OTP');
      speak('We sent a 4-digit code to your phone. For this demo, please enter 1 2 3 4.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP.');
      setAvatarState('idle');
    }
  };

  const verifyOtp = async (codeToVerify: string) => {
    handleUserActivity();
    setErrorMessage(null);
    speak('Verifying code...', 'thinking', 'Verifying security code...');
    try {
      const verifyRes = await maClient.verifyOtp(phoneNumber, codeToVerify);
      setSessionToken(verifyRes.sessionToken);

      const found = await maClient.lookupClientsByPhone(phoneNumber, verifyRes.sessionToken);

      if (flowType === 'SCHEDULED' || flowType === 'PAYMENT') {
        if (!found || found.length === 0) {
          setErrorMessage(
            flowType === 'PAYMENT'
              ? 'No billing records found for this phone number.'
              : 'No appointment found for this phone number. Please register as new patient.'
          );
          speak(
            flowType === 'PAYMENT'
              ? 'We could not find any billing records for this number. Please check with the front desk.'
              : 'We could not find an appointment with this number. You can register as a new patient.',
            'apologetic'
          );
          setScreen('PHONE');
          return;
        }

        if (found.length === 1) {
          const pat = found[0];
          setSelectedPatient(pat);
          const summary = await maClient.getVisitSummary(pat.id);
          setVisitSummary(summary);
          setScreen('DETAILS_SUMMARY');
          speak(
            flowType === 'PAYMENT'
              ? `Welcome ${pat.name}. Here are your pending bills and visit summary.`
              : `Welcome ${pat.name}. Here are your appointment details. Please confirm check-in.`
          );
        } else {
          setPatients(found);
          setScreen('PATIENT_PICK');
          speak(
            flowType === 'PAYMENT'
              ? 'Multiple profiles are registered under this number. Whose bill would you like to view?'
              : 'Multiple patients are registered under this number. Who is checking in today?'
          );
        }
      } else {
        // Walk-in / New Patient
        if (found && found.length > 0) {
          const first = found[0];
          setOnboardingForm((prev) => ({
            ...prev,
            name: first.name,
            age: first.age || 34,
            gender: first.gender || 'Female',
            email: first.email || '',
          }));
        }
        setScreen('ONBOARDING_DETAILS');
        speak('Please review and complete your patient details to register.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid code. Please enter 1234.');
      setAvatarState('idle');
    }
  };

  const handleSelectFamilyPatient = async (pat: PatientSummary) => {
    handleUserActivity();
    setSelectedPatient(pat);
    const summary = await maClient.getVisitSummary(pat.id);
    setVisitSummary(summary);
    setScreen('DETAILS_SUMMARY');
    speak(
      flowType === 'PAYMENT'
        ? `Welcome ${pat.name}. Here are your pending bills and visit summary.`
        : `Welcome ${pat.name}. Please confirm your appointment details.`
    );
  };

  // --- FLOW 3: Confirm Check-In & Token Issuance ---
  const handleConfirmCheckin = async () => {
    handleUserActivity();
    if (!visitSummary || !selectedPatient) return;
    speak('Confirming check-in and generating visit token...', 'thinking', 'Issuing queue ticket...');
    try {
      const res = await maClient.checkinAppointment(
        visitSummary.appointment.id,
        selectedPatient.id,
        sessionToken
      );
      setIssuedTicket(res.ticket);
      setScreen('TOKEN_ISSUED');
      speak(
        `Check-in complete! Your token number is ${res.ticket.tokenLabel}. Please proceed to ${res.ticket.stationName}.`,
        'success'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete check-in.');
      setAvatarState('idle');
    }
  };

  // --- FLOW 4: New Patient Walk-In Onboarding Steps ---
  const handleOnboardingStep1Next = () => {
    handleUserActivity();
    if (!onboardingForm.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    setErrorMessage(null);
    if ((onboardingForm.age || 0) < 18) {
      // Under 18: skip Face Registration automatically
      setOnboardingForm((prev) => ({
        ...prev,
        faceCheckinNextTime: false,
        capturedTemplate: undefined,
        faceConsentAt: undefined,
      }));
      setScreen('ONBOARDING_REVIEW');
      speak('Please review all your registration details and tap Approve to confirm.');
    } else {
      // 18+: go to Face Registration Intro
      setFaceRegPhase('intro');
      setRegSampleIndex(0);
      setRegAttempts(0);
      setRegHint('Look straight');
      setScreen('ONBOARDING_FACE');
      speak('Next time, check in with just a look. Would you like to register your face?');
    }
  };

  // Start 3-sample face enrollment capture loop
  const handleStartFaceRegistration = useCallback(async () => {
    handleUserActivity();
    setFaceRegPhase('capturing');
    setRegSampleIndex(0);
    setRegAttempts(0);
    setCapturedSamples([]);
    setRegHint('Look straight');
    speak('Please look directly at the camera to capture sample 1 of 3.', 'thinking', 'Enrolling biometric face template...');

    // Open live camera stream
    await startCameraPreview();

    // Sample 1: Front (0 to 1.5s)
    regStepTimerRef.current = setTimeout(() => {
      const s1 = [0.35, 0.72, 0.20, 0.88, 0.54, 0.16, 0.60, 0.85];
      setCapturedSamples([s1]);
      setRegSampleIndex(1);
      setRegHint('Turn slightly left');
      speak('Great. Now turn your head slightly left.', 'thinking');

      // Sample 2: Left (1.5 to 3.0s)
      regStepTimerRef.current = setTimeout(() => {
        const s2 = [0.38, 0.75, 0.24, 0.90, 0.56, 0.20, 0.64, 0.88];
        setCapturedSamples((prev) => [...prev, s2]);
        setRegSampleIndex(2);
        setRegHint('Turn slightly right');
        speak('Almost done. Turn your head slightly right.', 'thinking');

        // Sample 3: Right (3.0 to 4.5s)
        regStepTimerRef.current = setTimeout(async () => {
          const s3 = [0.41, 0.76, 0.23, 0.93, 0.55, 0.19, 0.65, 0.89];
          const finalTemplate = [
            (s1[0] + s2[0] + s3[0]) / 3,
            (s1[1] + s2[1] + s3[1]) / 3,
            (s1[2] + s2[2] + s3[2]) / 3,
            (s1[3] + s2[3] + s3[3]) / 3,
            (s1[4] + s2[4] + s3[4]) / 3,
            (s1[5] + s2[5] + s3[5]) / 3,
            (s1[6] + s2[6] + s3[6]) / 3,
            (s1[7] + s2[7] + s3[7]) / 3,
          ];

          // Check for duplicate registered face before enrolling
          const dupCheck = await maClient.matchFaceTemplate(finalTemplate, 0.85);
          if (dupCheck.matched && dupCheck.client) {
            setDuplicateCandidate(dupCheck.client);
            setFaceRegPhase('duplicate_found');
            stopCameraStream();
            speak(
              `It looks like you may already be registered. Is your name ${dupCheck.client.name.split(' ')[0]}?`,
              'thinking'
            );
            return;
          }

          // Enrollment success
          setOnboardingForm((prev) => ({
            ...prev,
            faceCheckinNextTime: true,
            faceConsentAt: new Date().toISOString(),
            capturedTemplate: finalTemplate,
          }));
          setFaceRegPhase('success');
          stopCameraStream();
          speak('Face registration complete! Next time you can check in with just a glance.', 'success');
        }, 1500);
      }, 1500);
    }, 1500);
  }, [startCameraPreview, speak, maClient, stopCameraStream, handleUserActivity]);

  const handleSkipFaceRegistration = useCallback(() => {
    handleUserActivity();
    stopCameraStream();
    setOnboardingForm((prev) => ({
      ...prev,
      faceCheckinNextTime: false,
      capturedTemplate: undefined,
      faceConsentAt: undefined,
    }));
    setScreen('ONBOARDING_REVIEW');
    speak(
      currentLanguage === 'hi'
        ? 'चेहरा पंजीकरण छोड़ दिया गया। कृपया अपनी जानकारी की समीक्षा करें।'
        : 'Face registration skipped. Please review all your registration details and approve.',
      'speaking'
    );
  }, [stopCameraStream, speak, currentLanguage, handleUserActivity]);

  const handleContinueToReview = () => {
    handleUserActivity();
    stopCameraStream();
    setScreen('ONBOARDING_REVIEW');
    speak('Please review all your registration details and tap Approve to confirm.');
  };

  const handleDuplicateConfirmYes = async () => {
    handleUserActivity();
    if (!duplicateCandidate) return;
    setSelectedPatient(duplicateCandidate);
    speak('Retrieving your existing patient record and booking your visit...', 'thinking');
    const summary = await maClient.getVisitSummary(duplicateCandidate.id);
    setVisitSummary(summary);
    setScreen('SERVICE_DOCTOR');
  };

  const handleDuplicateConfirmNo = () => {
    handleUserActivity();
    setDuplicateCandidate(null);
    setOnboardingForm((prev) => ({
      ...prev,
      faceCheckinNextTime: false,
      capturedTemplate: undefined,
    }));
    setScreen('ONBOARDING_REVIEW');
    speak('Continuing as new patient. Please review your registration details.');
  };

  // Test hooks for duplicate & quality simulation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__simulateDuplicateFace = (name = 'Sunita Rao') => {
        setDuplicateCandidate({
          id: 'pat_dup',
          name,
          phone: '+91 91234 56780',
          age: 58,
          gender: 'Female',
          faceEnrolled: true,
        });
        setFaceRegPhase('duplicate_found');
        speak(`It looks like you may already be registered. Is your name ${name}?`, 'thinking');
      };
      (window as any).__simulateBadQuality = () => {
        setRegAttempts((prev) => prev + 1);
        setRegHint('Please center your face and hold still');
      };
      (window as any).__simulateCameraDenied = () => {
        stopCameraStream();
        setFaceRegPhase('denied');
      };
      (window as any).__triggerFaceRegCapture = () => {
        handleStartFaceRegistration();
      };
    }
  }, [handleStartFaceRegistration, speak, stopCameraStream]);

  const handleOnboardingApprove = async () => {
    handleUserActivity();
    speak('Registering patient record and assigning clinic journey...', 'thinking', 'Creating client in MantraAssist...');
    try {
      const newClient = await maClient.createWalkInClient({
        name: onboardingForm.name.trim(),
        phone: phoneNumber,
        age: onboardingForm.age,
        gender: onboardingForm.gender,
        email: onboardingForm.email.trim() || undefined,
        reason: onboardingForm.reason,
        faceEnrolled: onboardingForm.faceCheckinNextTime,
        faceTemplate: onboardingForm.faceCheckinNextTime ? (onboardingForm.capturedTemplate || [0.38, 0.74, 0.22, 0.91, 0.55, 0.18, 0.63, 0.87]) : undefined,
        consentGiven: onboardingForm.faceCheckinNextTime,
        consentAt: onboardingForm.faceConsentAt,
        createdVia: 'ai_receptionist',
      });

      setSelectedPatient(newClient);
      setSelectedServiceId('');
      setSelectedProviderId('next_available');
      setScreen('SERVICE_DOCTOR');
      speak('Registration approved! Next, choose your consultation service and provider.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete onboarding registration.');
      setAvatarState('idle');
    }
  };

  const handleBookWalkIn = async () => {
    handleUserActivity();
    if (!selectedPatient) return;
    speak('Booking appointment and attaching clinic visit journey...', 'thinking', 'Reserving doctor slot...');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const apt = await maClient.bookAppointment({
        clientId: selectedPatient.id,
        serviceId: selectedServiceId,
        providerId: selectedProviderId === 'next_available' ? undefined : selectedProviderId,
        date: todayStr,
        time: 'Now (Next Available)',
        reason: onboardingForm.reason,
        source: 'ai_receptionist',
      });

      const checkinRes = await maClient.checkinAppointment(apt.id, selectedPatient.id, sessionToken);
      setIssuedTicket(checkinRes.ticket);
      setScreen('TOKEN_ISSUED');
      speak(
        `Your visit is booked and confirmed! Your token number is ${checkinRes.ticket.tokenLabel}. Please proceed to ${checkinRes.ticket.stationName}.`,
        'success'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to book appointment.');
      setAvatarState('idle');
    }
  };

  // --- FLOW 5: My Visit Status ---
  const loadMyVisitStatus = async () => {
    handleUserActivity();
    speak('Checking your active visit status...', 'thinking', 'Querying clinic queue...');
    const stations = await maClient.getStations();
    let foundTicket: QueueTicket | null = null;
    for (const st of stations) {
      const q = await maClient.getStationQueue(st.id);
      if (q.length > 0) {
        foundTicket = q[0];
        break;
      }
    }

    if (foundTicket) {
      setIssuedTicket(foundTicket);
      setScreen('MY_VISIT');
      speak(`You are currently in queue at ${foundTicket.stationName} with token ${foundTicket.tokenLabel}.`);
    } else {
      setScreen('MY_VISIT');
      speak('No active token found right now. Please check in with your appointment or register as a walk-in.');
    }
  };

  // --- FLOW 6: Directions & Wayfinding ---
  const handleOpenDirections = useCallback(async () => {
    handleUserActivity();
    stopCameraStream();
    setFlowType(null);
    const cats = await loadDirectionCategories();
    setScreen('DIRECTIONS_CATEGORIES');
    navigate('/reception/directions');
    speak(
      currentLanguage === 'hi'
        ? 'यहाँ क्लिनिक के सभी विभाग हैं। दिशा-निर्देशों के लिए कृपया एक श्रेणी चुनें।'
        : 'Here are all clinic departments. Please select a category to view room directions.'
    );
  }, [handleUserActivity, stopCameraStream, loadDirectionCategories, speak, currentLanguage, navigate]);

  const handleSelectDirectionCategory = useCallback(
    async (cat: DirectionCategory) => {
      handleUserActivity();
      setSelectedDirectionCategory(cat);
      setScreen('DIRECTIONS_ROOMS');
      navigate(`/reception/directions/${cat.id}`);
      maClient.logAuditEvent({
        id: `evt_cat_${Date.now()}`,
        orgId: 'org_mantracare_default',
        action: 'receptionist_directions_category_viewed',
        metadata: { categoryId: cat.id },
        timestamp: new Date().toISOString(),
      });
      speak(
        currentLanguage === 'hi'
          ? `${cat.name} के कमरे। कृपया अपना गंतव्य चुनें।`
          : `Here are the rooms in ${cat.name}. Please select your destination.`
      );
    },
    [handleUserActivity, maClient, speak, currentLanguage, navigate]
  );

  const handleSelectDirectionRoom = useCallback(
    (room: DirectionRoom, source: 'browse' | 'voice_direct' = 'browse', categoryId?: string) => {
      handleUserActivity();
      setSelectedDirectionRoom(room);
      setDirectionsEntrySource(source);
      setScreen('DIRECTIONS_RESULT');
      const catId = categoryId || selectedDirectionCategory?.id || room.categoryId || 'cat_clinical';
      navigate(`/reception/directions/${catId}/${room.id}`);
      maClient.logAuditEvent({
        id: `evt_room_${Date.now()}`,
        orgId: 'org_mantracare_default',
        action: 'receptionist_directions_room_viewed',
        metadata: { roomId: room.id, source: source === 'voice_direct' ? 'voice' : 'touch' },
        timestamp: new Date().toISOString(),
      });
      const locSpeech = room.floorWing ? `is on ${room.floorWing}.` : '';
      speak(
        currentLanguage === 'hi'
          ? `${room.name} ${locSpeech} ${room.directions}`
          : `${room.name} ${locSpeech} ${room.directions}`
      );
    },
    [handleUserActivity, maClient, speak, currentLanguage, selectedDirectionCategory, navigate]
  );

  const handleDirectionsBack = useCallback(() => {
    handleUserActivity();
    if (screen === 'DIRECTIONS_RESULT') {
      if (directionsEntrySource === 'voice_direct') {
        handleResetSession();
      } else {
        const catId = selectedDirectionCategory?.id || 'cat_clinical';
        navigate(`/reception/directions/${catId}`);
        setScreen('DIRECTIONS_ROOMS');
      }
    } else if (screen === 'DIRECTIONS_ROOMS') {
      navigate('/reception/directions');
      setScreen('DIRECTIONS_CATEGORIES');
    } else {
      handleResetSession();
    }
  }, [screen, directionsEntrySource, handleResetSession, handleUserActivity, selectedDirectionCategory, navigate]);

  const handleResolveIntent = useCallback(
    async (rawTranscript: string, options: { isAmbient?: boolean } = {}) => {
      const { isAmbient = false } = options;
      const text = (rawTranscript || '').trim();
      const normalized = text.toLowerCase();

      // Step 1: Raw recognized text logging (Part B Diagnosis)
      console.log(`[Voice Intent Resolver] 🎙️ Processing speech input: "${rawTranscript}" (isAmbient: ${isAmbient})`);

      if (!text) {
        console.log('[Voice Intent Resolver] ℹ️ Empty transcript received, skipping intent match.');
        return false;
      }

      // Priority 1: Specific Room Match across all categories (Room > Category > General Intent > Fallback)
      const loadedCats = directionCategories.length > 0 ? directionCategories : await loadDirectionCategories();
      const cats = loadedCats.length > 0 ? loadedCats : STATIC_DIRECTION_CATEGORIES;

      let matchedRoom: { room: DirectionRoom; category: DirectionCategory } | null = null;
      for (const cat of cats) {
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

      // Direct fallback matching for common destinations if loop missed
      if (!matchedRoom) {
        if (
          normalized.includes('pharmacy') ||
          normalized.includes('medicine') ||
          normalized.includes('chemist') ||
          normalized.includes('dispensary') ||
          normalized.includes('दवा')
        ) {
          matchedRoom = {
            room: STATIC_DIRECTION_CATEGORIES[0].rooms[0],
            category: STATIC_DIRECTION_CATEGORIES[0],
          };
        } else if (
          normalized.includes('lab') ||
          normalized.includes('diagnostic') ||
          normalized.includes('blood') ||
          normalized.includes('test') ||
          normalized.includes('जाँच') ||
          normalized.includes('लैब')
        ) {
          matchedRoom = {
            room: STATIC_DIRECTION_CATEGORIES[0].rooms[1],
            category: STATIC_DIRECTION_CATEGORIES[0],
          };
        } else if (
          normalized.includes('restroom') ||
          normalized.includes('washroom') ||
          normalized.includes('toilet') ||
          normalized.includes('bathroom') ||
          normalized.includes('शौचालय')
        ) {
          matchedRoom = {
            room: STATIC_DIRECTION_CATEGORIES[2].rooms[0],
            category: STATIC_DIRECTION_CATEGORIES[2],
          };
        } else if (normalized.includes('water') || normalized.includes('पानी')) {
          matchedRoom = {
            room: STATIC_DIRECTION_CATEGORIES[2].rooms[1],
            category: STATIC_DIRECTION_CATEGORIES[2],
          };
        }
      }

      if (matchedRoom) {
        unrecognizedAttemptsRef.current = 0;
        const destUrl = `/reception/directions/${matchedRoom.category.id}/${matchedRoom.room.id}`;
        console.log(`[Voice Intent Resolver] 🎯 PRIORITY 1 MATCH: Room "${matchedRoom.room.name}" (${matchedRoom.room.id}) -> Navigating to ${destUrl}`);
        handleUserActivity();
        stopCameraStream();
        setSelectedDirectionCategory(matchedRoom.category);
        setSelectedDirectionRoom(matchedRoom.room);
        setDirectionsEntrySource('voice_direct');
        setScreen('DIRECTIONS_RESULT');
        navigate(destUrl);
        const locSpeech = matchedRoom.room.floorWing ? `is on ${matchedRoom.room.floorWing}.` : '';
        speak(
          currentLanguage === 'hi'
            ? `${matchedRoom.room.name} ${locSpeech} ${matchedRoom.room.directions}`
            : `${matchedRoom.room.name} ${locSpeech} ${matchedRoom.room.directions}`
        );
        return true;
      }

      // Priority 2: Category Match
      const isExplicitDirections = DIRECTIONS_WORDS.some((w) => normalized.includes(w.toLowerCase()));
      let matchedCat: DirectionCategory | null = null;
      for (const cat of cats) {
        const catLower = cat.name.toLowerCase();
        const catKeywords = catLower.split(/[\s&,-]+/).filter((w) => w.length > 2);
        if (
          normalized.includes(catLower) ||
          (isExplicitDirections && catKeywords.some((kw) => normalized.includes(kw))) ||
          (cat.id === 'cat_pharmacy_labs' &&
            (normalized.includes('pharmacy') ||
              normalized.includes('lab') ||
              normalized.includes('diagnostic') ||
              normalized.includes('medicine') ||
              normalized.includes('test') ||
              normalized.includes('दवा') ||
              normalized.includes('जाँच'))) ||
          (cat.id === 'cat_facilities' &&
            (normalized.includes('facilities') ||
              normalized.includes('restroom') ||
              normalized.includes('washroom') ||
              normalized.includes('toilet') ||
              normalized.includes('bathroom') ||
              normalized.includes('water') ||
              normalized.includes('drinking water') ||
              normalized.includes('शौचालय') ||
              normalized.includes('वॉशरूम') ||
              normalized.includes('पानी'))) ||
          (cat.id === 'cat_clinical' &&
            isExplicitDirections &&
            (normalized.includes('clinical') || normalized.includes('consultation') || normalized.includes('ओपीडी') || normalized.includes('doctor')))
        ) {
          matchedCat = cat;
          break;
        }
      }

      if (matchedCat) {
        unrecognizedAttemptsRef.current = 0;
        const destUrl = `/reception/directions/${matchedCat.id}`;
        console.log(`[Voice Intent Resolver] 🎯 PRIORITY 2 MATCH: Category "${matchedCat.name}" (${matchedCat.id}) -> Navigating to ${destUrl}`);
        handleUserActivity();
        stopCameraStream();
        setSelectedDirectionCategory(matchedCat);
        setScreen('DIRECTIONS_ROOMS');
        navigate(destUrl);
        speak(
          currentLanguage === 'hi'
            ? `${matchedCat.name} के कमरे। कृपया अपना गंतव्य चुनें।`
            : `Here are the rooms in ${matchedCat.name}. Please select your destination.`
        );
        return true;
      }

      // Priority 3: General Intents (Walk-in, Payment, Appointment, Generic Directions)
      const isWalkin = WALKIN_WORDS.some((w) => normalized.includes(w.toLowerCase()));
      const isPayment = !isWalkin && PAYMENT_WORDS.some((w) => normalized.includes(w.toLowerCase()));
      const isAppointment = !isWalkin && !isPayment && APPOINTMENT_WORDS.some((w) => normalized.includes(w.toLowerCase()));

      console.log(`[Voice Intent Resolver] 🔍 General intent results for "${normalized}":`, {
        isWalkin,
        isPayment,
        isAppointment,
        isExplicitDirections,
      });

      // 3A. Walk-in Intent
      if (isWalkin) {
        unrecognizedAttemptsRef.current = 0;
        console.log('[Voice Intent Resolver] 🎯 PRIORITY 3 MATCH: Walk-in Registration -> /reception/walk-in');
        handleUserActivity();
        stopCameraStream();
        setFlowType('WALK_IN');
        setScreen('PHONE');
        navigate('/reception/walk-in');
        speak(
          currentLanguage === 'hi'
            ? 'स्वागत है! पंजीकरण शुरू करने के लिए अपना फोन नंबर दर्ज करें।'
            : 'Welcome! Please enter your mobile phone number on the touch keypad to begin registration.'
        );
        return true;
      }

      // 3B. Payment Intent
      if (isPayment) {
        unrecognizedAttemptsRef.current = 0;
        console.log('[Voice Intent Resolver] 🎯 PRIORITY 3 MATCH: Bill Payment -> /reception/billing');
        handleUserActivity();
        stopCameraStream();
        setFlowType('PAYMENT');
        setScreen('PHONE');
        navigate('/reception/billing');
        speak(
          currentLanguage === 'hi'
            ? 'कृपया अपना बिल और बकाया देखने के लिए अपना मोबाइल नंबर दर्ज करें।'
            : 'Please enter your mobile phone number on the touch keypad to look up your bill.'
        );
        return true;
      }

      // 3C. Appointment Intent
      if (isAppointment) {
        unrecognizedAttemptsRef.current = 0;
        console.log('[Voice Intent Resolver] 🎯 PRIORITY 3 MATCH: Appointment Check-in -> /reception/appointment');
        handleUserActivity();
        stopCameraStream();
        setFlowType('SCHEDULED');
        setScreen('FACE_SCAN');
        navigate('/reception/appointment');
        speak(
          currentLanguage === 'hi'
            ? 'कृपया चेक इन करने के लिए कैमरे में देखें या फोन नंबर दर्ज करें।'
            : 'Please look into the camera to check in, or use your phone number below.'
        );
        return true;
      }

      // 3D. Generic directions intent ("get directions", "where do I go", "directions")
      if (isExplicitDirections) {
        unrecognizedAttemptsRef.current = 0;
        console.log('[Voice Intent Resolver] 🎯 PRIORITY 3 MATCH: Generic Directions -> /reception/directions');
        handleUserActivity();
        stopCameraStream();
        setScreen('DIRECTIONS_CATEGORIES');
        navigate('/reception/directions');
        speak(
          currentLanguage === 'hi'
            ? 'यहाँ क्लिनिक के सभी विभाग हैं। दिशा-निर्देशों के लिए कृपया एक श्रेणी चुनें।'
            : 'Here are all clinic departments. Please select a category to view room directions.'
        );
        return true;
      }

      // Priority 4: Fallback for Unrelated / nonsensical speech -> Stay on /reception AMBIENT screen (No landing page)
      console.log(`[Voice Intent Resolver] ⚠️ PRIORITY 4: No match found for "${normalized}". Remaining on AMBIENT surface.`);
      handleUserActivity();
      setAmbientPhase('dormant');
      setAvatarState('idle');

      if (unrecognizedAttemptsRef.current === 0) {
        unrecognizedAttemptsRef.current += 1;
        speak(
          currentLanguage === 'hi'
            ? 'माफ़ कीजिए, मैं समझ नहीं पाई। आप स्क्रीन पर दिए गए विकल्पों में से चुन सकते हैं या पूछ सकते हैं।'
            : "I'm sorry, I didn't quite catch that. You can tap an option on screen or tell me what you need.",
          'speaking',
          undefined,
          () => {
            if (screenRef.current === 'AMBIENT') {
              setAmbientPhase('listening');
              startAmbientListeningRef.current?.();
            } else {
              setAvatarState('idle');
              setAmbientPhase('dormant');
            }
          }
        );
      } else {
        console.log('[Voice Intent Resolver] 🤫 Repeated unhandled speech: keeping listening active without looping TTS.');
        if (screenRef.current === 'AMBIENT') {
          setTimeout(() => {
            if (screenRef.current === 'AMBIENT') {
              setAmbientPhase('listening');
              startAmbientListeningRef.current?.();
            }
          }, 350);
        }
      }
      return false;
    },
    [
      directionCategories,
      loadDirectionCategories,
      handleUserActivity,
      stopCameraStream,
      speak,
      currentLanguage,
      navigate,
    ]
  );
  resolveIntentRef.current = handleResolveIntent;
  processDirectionsIntentRef.current = handleResolveIntent;

  // Global Floating Mic & Voice Command State
  const [isListeningGlobal, setIsListeningGlobal] = useState(false);
  const [heardSuccessGlobal, setHeardSuccessGlobal] = useState(false);
  const globalRecognitionRef = useRef<any>(null);
  const globalTimeoutRef = useRef<any>(null);
  const activeFocusedFieldRef = useRef<'name' | 'reason' | 'email' | null>(null);

  // Screen Contextual Voice Command Handler
  const handleVoiceCommand = useCallback(
    (rawTranscript: string) => {
      const text = rawTranscript.trim().toLowerCase();
      console.log(`[Voice Assistant] Heard: "${rawTranscript}" on screen: ${screen}`);

      if (screen === 'IDLE' || screen === 'AMBIENT') {
        if (resolveIntentRef.current) {
          resolveIntentRef.current(rawTranscript, { isAmbient: screen === 'AMBIENT' });
        }
        return;
      }

      // 1. Text input focus routing
      if (activeFocusedFieldRef.current === 'name') {
        setOnboardingForm((prev) => ({ ...prev, name: rawTranscript.trim() }));
        setDictationSuccessField('name');
        setTimeout(() => setDictationSuccessField(null), 1500);
        return;
      }
      if (activeFocusedFieldRef.current === 'reason') {
        setOnboardingForm((prev) => ({ ...prev, reason: rawTranscript.trim() }));
        setDictationSuccessField('reason');
        setTimeout(() => setDictationSuccessField(null), 1500);
        return;
      }
      if (activeFocusedFieldRef.current === 'email') {
        setOnboardingForm((prev) => ({ ...prev, email: rawTranscript.trim().replace(/\s+/g, '') }));
        return;
      }

      // 2. Screen-specific voice command routing
      if (screen === 'FACE_SCAN' || screen === 'VERIFY_CHOICE' || screen === 'FACE_CONSENT') {
        if (text.includes('start') || text.includes('scan') || text.includes('begin') || text.includes('ready')) {
          startScanning();
        } else if (text.includes('phone') || text.includes('number') || text.includes('mobile')) {
          stopCameraStream();
          startPhoneVerification();
        } else if (text.includes('cancel') || text.includes('stop')) {
          cancelScanning();
        }
      } else if (screen === 'FACE_CONFIRM') {
        if (text.includes('yes') || text.includes('me') || text.includes('confirm') || text.includes('correct') || text.includes('haan')) {
          handleFaceConfirmYes();
        } else if (text.includes('no') || text.includes('not') || text.includes('nahin')) {
          handleFaceConfirmNo();
        }
      } else if (screen === 'PHONE') {
        if (text.includes('clear') || text.includes('reset')) {
          setPhoneNumber('');
        } else if (text.includes('back') || text.includes('delete')) {
          setPhoneNumber((prev) => prev.slice(0, -1));
        } else if (text.includes('continue') || text.includes('send') || text.includes('next') || text.includes('code')) {
          handleSendOtp();
        } else if (text.includes('face') || text.includes('camera')) {
          handleResetSession();
        } else {
          const wordToNum: Record<string, string> = {
            zero: '0', one: '1', two: '2', three: '3', four: '4',
            five: '5', six: '6', seven: '7', eight: '8', nine: '9',
          };
          let digits = '';
          text.split(/\s+/).forEach((w) => {
            if (wordToNum[w]) digits += wordToNum[w];
            else digits += w.replace(/\D/g, '');
          });
          if (digits) {
            setPhoneNumber((prev) => (prev + digits).slice(0, 15));
          }
        }
      } else if (screen === 'OTP') {
        if (text.includes('clear') || text.includes('reset')) {
          setOtp('');
        } else if (text.includes('back') || text.includes('delete')) {
          setOtp((prev) => prev.slice(0, -1));
        } else {
          const wordToNum: Record<string, string> = {
            zero: '0', one: '1', two: '2', three: '3', four: '4',
            five: '5', six: '6', seven: '7', eight: '8', nine: '9',
          };
          let digits = '';
          text.split(/\s+/).forEach((w) => {
            if (wordToNum[w]) digits += wordToNum[w];
            else digits += w.replace(/\D/g, '');
          });
          if (digits) {
            setOtp((prev) => (prev + digits).slice(0, 4));
          }
        }
      } else if (screen === 'PATIENT_PICK') {
        const found = patients.find((p) => text.includes(p.name.toLowerCase()));
        if (found) {
          handleSelectFamilyPatient(found);
        }
      } else if (screen === 'DETAILS_SUMMARY') {
        if (text.includes('confirm') || text.includes('check in') || text.includes('yes') || text.includes('print') || text.includes('done') || text.includes('token')) {
          handleConfirmCheckin();
        } else if (text.includes('not me') || text.includes('cancel') || text.includes('no') || text.includes('back')) {
          handleResetSession();
        }
      } else if (screen === 'ONBOARDING_DETAILS') {
        if (text.includes('next') || text.includes('continue') || text.includes('submit') || text.includes('review') || text.includes('face')) {
          handleOnboardingStep1Next();
        } else if (!onboardingForm.name) {
          setOnboardingForm((prev) => ({ ...prev, name: rawTranscript.trim() }));
        } else {
          setOnboardingForm((prev) => ({ ...prev, reason: rawTranscript.trim() }));
        }
      } else if (screen === 'ONBOARDING_FACE') {
        if (faceRegPhase === 'intro') {
          if (text.includes('register') || text.includes('face') || text.includes('start') || text.includes('yes') || text.includes('camera')) {
            handleStartFaceRegistration();
          } else if (text.includes('skip') || text.includes('no') || text.includes('later') || text.includes('cancel')) {
            handleSkipFaceRegistration();
          }
        } else if (faceRegPhase === 'capturing') {
          if (text.includes('cancel') || text.includes('skip') || text.includes('stop')) {
            handleSkipFaceRegistration();
          }
        } else if (faceRegPhase === 'duplicate_found') {
          if (text.includes('yes') || text.includes('me') || text.includes('confirm')) {
            handleDuplicateConfirmYes();
          } else if (text.includes('no') || text.includes('new') || text.includes('continue')) {
            handleDuplicateConfirmNo();
          }
        } else if (faceRegPhase === 'success') {
          if (text.includes('continue') || text.includes('review') || text.includes('next') || text.includes('done')) {
            handleContinueToReview();
          }
        }
      } else if (screen === 'ONBOARDING_REVIEW') {
        if (text.includes('approve') || text.includes('confirm') || text.includes('yes') || text.includes('submit') || text.includes('done')) {
          handleOnboardingApprove();
        } else if (text.includes('edit') || text.includes('change') || text.includes('back')) {
          setScreen('ONBOARDING_DETAILS');
        } else if (text.includes('decline') || text.includes('cancel') || text.includes('no')) {
          handleResetSession();
        }
      } else if (screen === 'SERVICE_DOCTOR') {
        if (text.includes('general') || text.includes('consultation') || text.includes('general consultation')) {
          setSelectedServiceId('srv_consult');
          setSelectedProviderId('next_available');
        } else if (text.includes('cardio') || text.includes('heart') || text.includes('cardiology')) {
          setSelectedServiceId('srv_cardio');
          setSelectedProviderId('next_available');
        } else if (text.includes('dental') || text.includes('tooth') || text.includes('teeth') || text.includes('clean')) {
          setSelectedServiceId('srv_dental');
          setSelectedProviderId('next_available');
        } else if (text.includes('next available') || text.includes('first available') || text.includes('any')) {
          setSelectedProviderId('next_available');
        } else if (text.includes('confirm') || text.includes('issue') || text.includes('ticket') || text.includes('book') || text.includes('done')) {
          if (selectedServiceId && selectedProviderId) {
            handleBookWalkIn();
          }
        } else {
          const matchProv = providers.find((p) => text.includes(p.name.toLowerCase()));
          if (matchProv) {
            setSelectedProviderId(matchProv.id);
          }
        }
      } else if (screen === 'TOKEN_ISSUED') {
        if (text.includes('sms') || text.includes('send') || text.includes('text')) {
          if (issuedTicket) {
            maClient.sendTokenNotification(issuedTicket.id, phoneNumber || '+91 98765 43210', 'sms');
            showToast('Token details sent via SMS!');
          }
        } else if (text.includes('done') || text.includes('finish') || text.includes('home') || text.includes('close')) {
          handleResetSession();
        }
      } else if (screen === 'MY_VISIT') {
        if (text.includes('close') || text.includes('home') || text.includes('done') || text.includes('back')) {
          handleResetSession();
        }
      } else if (screen === 'DIRECTIONS_CATEGORIES') {
        if (text.includes('back') || text.includes('home') || text.includes('cancel')) {
          handleResetSession();
        } else {
          if (processDirectionsIntentRef.current) {
            processDirectionsIntentRef.current(rawTranscript);
          }
        }
      } else if (screen === 'DIRECTIONS_ROOMS') {
        if (text.includes('back') || text.includes('categories') || text.includes('category')) {
          setScreen('DIRECTIONS_CATEGORIES');
        } else if (text.includes('home') || text.includes('done')) {
          handleResetSession();
        } else {
          if (processDirectionsIntentRef.current) {
            processDirectionsIntentRef.current(rawTranscript);
          }
        }
      } else if (screen === 'DIRECTIONS_RESULT') {
        if (text.includes('done') || text.includes('finish') || text.includes('home') || text.includes('close')) {
          handleResetSession();
        } else if (text.includes('back')) {
          handleDirectionsBack();
        }
      } else {
        // Global intent trigger fallback
        if (resolveIntentRef.current) {
          resolveIntentRef.current(rawTranscript);
        }
      }
    },
    [
      screen,
      onboardingForm,
      faceRegPhase,
      patients,
      providers,
      selectedServiceId,
      selectedProviderId,
      issuedTicket,
      phoneNumber,
      startScanning,
      stopCameraStream,
      startPhoneVerification,
      cancelScanning,
      handleFaceConfirmYes,
      handleFaceConfirmNo,
      handleSendOtp,
      handleResetSession,
      handleSelectFamilyPatient,
      handleConfirmCheckin,
      handleOnboardingStep1Next,
      handleStartFaceRegistration,
      handleSkipFaceRegistration,
      handleDuplicateConfirmYes,
      handleDuplicateConfirmNo,
      handleContinueToReview,
      handleOnboardingApprove,
      handleBookWalkIn,
      handleDirectionsBack,
      maClient,
      showToast,
    ]
  );

  const startGlobalDictation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    if (isListeningGlobal) {
      if (globalRecognitionRef.current) {
        try {
          globalRecognitionRef.current.stop();
        } catch {}
      }
      if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
      setIsListeningGlobal(false);
      return;
    }

    if (globalRecognitionRef.current) {
      try {
        globalRecognitionRef.current.stop();
      } catch {}
    }
    if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningGlobal(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          handleVoiceCommand(transcript);
          setHeardSuccessGlobal(true);
          setTimeout(() => setHeardSuccessGlobal(false), 1500);
        }
        setIsListeningGlobal(false);
      };

      recognition.onerror = () => {
        setIsListeningGlobal(false);
      };

      recognition.onend = () => {
        setIsListeningGlobal(false);
      };

      globalRecognitionRef.current = recognition;
      recognition.start();

      globalTimeoutRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {}
        setIsListeningGlobal(false);
      }, 10000);
    } catch {
      setIsListeningGlobal(false);
    }
  }, [isListeningGlobal, currentLanguage, handleVoiceCommand]);

  // Step Progress Calculation
  const getStepProgress = () => {
    if (flowType === 'SCHEDULED') {
      if (screen === 'VERIFY_CHOICE' || screen === 'FACE_CONSENT' || screen === 'FACE_SCAN') return { current: 1, total: 3, label: 'Identity Verification' };
      if (screen === 'FACE_CONFIRM' || screen === 'PHONE' || screen === 'OTP' || screen === 'PATIENT_PICK') return { current: 2, total: 3, label: 'Patient Verification' };
      if (screen === 'DETAILS_SUMMARY' || screen === 'TOKEN_ISSUED') return { current: 3, total: 3, label: 'Visit Summary' };
    } else if (flowType === 'WALK_IN') {
      const isMinor = (onboardingForm.age || 0) < 18;
      if (isMinor) {
        if (screen === 'PHONE' || screen === 'OTP') return { current: 1, total: 4, label: 'Mobile Number' };
        if (screen === 'ONBOARDING_DETAILS') return { current: 2, total: 4, label: 'Patient Details' };
        if (screen === 'ONBOARDING_REVIEW') return { current: 3, total: 4, label: 'Review & Confirm' };
        if (screen === 'SERVICE_DOCTOR' || screen === 'TOKEN_ISSUED') return { current: 4, total: 4, label: 'Service & Token' };
      } else {
        if (screen === 'PHONE' || screen === 'OTP') return { current: 1, total: 5, label: 'Mobile Number' };
        if (screen === 'ONBOARDING_DETAILS') return { current: 2, total: 5, label: 'Patient Details' };
        if (screen === 'ONBOARDING_FACE') return { current: 3, total: 5, label: 'Face Registration' };
        if (screen === 'ONBOARDING_REVIEW') return { current: 4, total: 5, label: 'Review & Confirm' };
        if (screen === 'SERVICE_DOCTOR' || screen === 'TOKEN_ISSUED') return { current: 5, total: 5, label: 'Service & Token' };
      }
    }
    return null;
  };

  const stepProgress = getStepProgress();

  if (screen === 'AMBIENT') {
    return (
      <div
        onClick={handleUserActivity}
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#121820] via-[#1b2634] to-[#253545] flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 relative select-none font-sans text-white"
      >
        {/* Hidden live camera stream for anonymous presence detection */}
        <video
          ref={ambientVideoRef}
          autoPlay
          playsInline
          muted
          className="hidden pointer-events-none"
        />

        {/* Ambient Dynamic Radial Glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
            ambientPhase === 'greeting'
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(20,86,240,0.35)_0%,transparent_70%)]'
              : ambientPhase === 'listening'
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.30)_0%,transparent_70%)]'
              : ambientPhase === 'engaged'
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.25)_0%,transparent_70%)]'
              : ambientPhase === 'routing'
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.28)_0%,transparent_70%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(20,86,240,0.14)_0%,transparent_70%)]'
          }`}
        />

        {/* Temporary Dev-Only Debug Overlay (Visible only when ?debug=1 or ?debug=true) */}
        {isDebug && (
          <div className="absolute top-5 left-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-amber-400/50 text-amber-300 font-mono text-xs shadow-xl pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              [DEBUG] Phase: <strong className="text-white uppercase">{ambientPhase}</strong> | Screen: {screen} | Cam: {ambientCameraActive ? 'Active' : ambientCameraDenied ? 'Denied' : 'Off'}
            </span>
          </div>
        )}

        {/* Top Header / Branding Bar */}
        <header className="w-full flex items-center justify-between z-20 shrink-0 max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-200 font-display">
                {DEFAULT_ORGANIZATION_NAME}
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2 font-medium">
                • AI Receptionist
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Minimal Camera Indicator (Conditional on active camera stream) */}
            {ambientCameraActive && !ambientCameraDenied && (
              <div
                className="relative group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-blue-300 transition-all cursor-default"
                title="Camera active for greeting only"
              >
                <Camera className="w-4 h-4 text-blue-300" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-[#1b2634] animate-pulse" />
                
                {/* Tooltip on hover/long-press only */}
                <span className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-semibold rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  Camera active for greeting only
                </span>
              </div>
            )}

            {/* Top-Right Language Switcher */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextLang = currentLanguage === 'en' ? 'hi' : 'en';
                setCurrentLanguage(nextLang);
                speak(
                  nextLang === 'hi'
                    ? 'भाषा बदलकर हिंदी कर दी गई है।'
                    : 'Language changed to English.'
                );
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-[#60a5fa]" />
              <span>{currentLanguage === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
          </div>
        </header>

        {/* Center Main Stage: Symmetrical Quick Actions & Large Centered Avatar */}
        <main className="flex-1 w-full max-w-6xl flex flex-col xl:flex-row items-center justify-center relative min-h-0 py-2 z-10 gap-6 xl:gap-8">
          {/* Left Symmetrical Quick Action Group (Desktop >= 1280px) */}
          <div className="hidden xl:flex flex-col items-center justify-center gap-8 shrink-0 z-20">
            {/* 1. Appointment */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('SCHEDULED');
                setScreen('FACE_SCAN');
                navigate('/reception/appointment');
                speak(
                  currentLanguage === 'hi'
                    ? 'कृपया चेक इन करने के लिए कैमरे में देखें या फोन नंबर दर्ज करें।'
                    : 'Please look into the camera to check in, or use your phone number below.'
                );
              }}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-blue-400/60 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(20,86,240,0.40)] hover:scale-105 transition-all flex items-center justify-center text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors tracking-wide text-center">
                {currentLanguage === 'hi' ? 'अपॉइंटमेंट' : 'Appointment'}
              </span>
            </button>

            {/* 2. Walk-in */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('WALK_IN');
                setScreen('PHONE');
                navigate('/reception/walk-in');
                speak(
                  currentLanguage === 'hi'
                    ? 'स्वागत है! पंजीकरण शुरू करने के लिए अपना फोन नंबर दर्ज करें।'
                    : 'Welcome! Please enter your mobile phone number on the touch keypad to begin registration.'
                );
              }}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-blue-400/60 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(20,86,240,0.40)] hover:scale-105 transition-all flex items-center justify-center text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors tracking-wide text-center">
                {currentLanguage === 'hi' ? 'वॉक-इन' : 'Walk-in'}
              </span>
            </button>
          </div>

          {/* Center: Enlarged, Visual Anchor Animated Avatar (55-65vh) */}
          <div className="flex-1 w-full h-[52vh] sm:h-[58vh] xl:h-[64vh] flex items-center justify-center relative">
            <AnimatedAvatar
              state={
                avatarState === 'speaking'
                  ? 'speaking'
                  : ambientPhase === 'greeting'
                  ? 'speaking'
                  : ambientPhase === 'listening'
                  ? 'listening'
                  : ambientPhase === 'routing' || avatarState === 'thinking'
                  ? 'thinking'
                  : 'idle'
              }
              avatarName="Aria"
              thinkingMessage={
                ambientPhase === 'routing' || avatarState === 'thinking'
                  ? thinkingMessage || 'One moment, directing your visit...'
                  : `Welcome to ${DEFAULT_ORGANIZATION_NAME}`
              }
              className="h-full w-auto"
            />
          </div>

          {/* Right Symmetrical Quick Action Group (Desktop >= 1280px) */}
          <div className="hidden xl:flex flex-col items-center justify-center gap-8 shrink-0 z-20">
            {/* 3. Pay Bill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('PAYMENT');
                setScreen('PHONE');
                navigate('/reception/billing');
                speak(
                  currentLanguage === 'hi'
                    ? 'कृपया अपना बिल और बकाया देखने के लिए अपना मोबाइल नंबर दर्ज करें।'
                    : 'Please enter your mobile phone number on the touch keypad to look up your bill.'
                );
              }}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-blue-400/60 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(20,86,240,0.40)] hover:scale-105 transition-all flex items-center justify-center text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors tracking-wide text-center">
                {currentLanguage === 'hi' ? 'बिल भुगतान' : 'Pay Bill'}
              </span>
            </button>

            {/* 4. Directions */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDirections();
              }}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-blue-400/60 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(20,86,240,0.40)] hover:scale-105 transition-all flex items-center justify-center text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Navigation className="w-5 h-5" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors tracking-wide text-center">
                {currentLanguage === 'hi' ? 'दिशा-निर्देश' : 'Directions'}
              </span>
            </button>
          </div>

          {/* Narrow Screens & Portrait Quick Action Row (< 1280px) */}
          <div className="xl:hidden flex flex-wrap items-center justify-center gap-5 sm:gap-8 z-20 pb-2">
            {/* 1. Appointment */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('SCHEDULED');
                setScreen('FACE_SCAN');
                navigate('/reception/appointment');
                speak(
                  currentLanguage === 'hi'
                    ? 'कृपया चेक इन करने के लिए कैमरे में देखें या फोन नंबर दर्ज करें।'
                    : 'Please look into the camera to check in, or use your phone number below.'
                );
              }}
              className="group flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center text-white">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white">
                  <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                {currentLanguage === 'hi' ? 'अपॉइंटमेंट' : 'Appointment'}
              </span>
            </button>

            {/* 2. Walk-in */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('WALK_IN');
                setScreen('PHONE');
                navigate('/reception/walk-in');
                speak(
                  currentLanguage === 'hi'
                    ? 'स्वागत है! पंजीकरण शुरू करने के लिए अपना फोन नंबर दर्ज करें।'
                    : 'Welcome! Please enter your mobile phone number on the touch keypad to begin registration.'
                );
              }}
              className="group flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center text-white">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                {currentLanguage === 'hi' ? 'वॉक-इन' : 'Walk-in'}
              </span>
            </button>

            {/* 3. Pay Bill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserActivity();
                stopCameraStream();
                setFlowType('PAYMENT');
                setScreen('PHONE');
                navigate('/reception/billing');
                speak(
                  currentLanguage === 'hi'
                    ? 'कृपया अपना बिल और बकाया देखने के लिए अपना मोबाइल नंबर दर्ज करें।'
                    : 'Please enter your mobile phone number on the touch keypad to look up your bill.'
                );
              }}
              className="group flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center text-white">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                {currentLanguage === 'hi' ? 'बिल भुगतान' : 'Pay Bill'}
              </span>
            </button>

            {/* 4. Directions */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDirections();
              }}
              className="group flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center text-white">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] flex items-center justify-center text-white">
                  <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                {currentLanguage === 'hi' ? 'दिशा-निर्देश' : 'Directions'}
              </span>
            </button>
          </div>
        </main>

        {/* Bottom Bar: Bottom-Left Start Button & Center Spoken Caption/Waveform */}
        <footer className="w-full max-w-6xl z-20 shrink-0 flex items-center justify-between relative min-h-[48px] pb-1">
          {/* Small Start Button in bottom-left corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUserActivity();
              triggerPresenceFlow();
            }}
            disabled={ambientPhase === 'engaged'}
            className="w-[140px] sm:w-[150px] h-[var(--touch,48px)] min-h-[48px] rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-blue-400/50 text-white font-semibold text-xs sm:text-sm shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.30)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#60a5fa] shrink-0" />
            <span>{currentLanguage === 'hi' ? 'शुरू करें' : 'Start'}</span>
          </button>

          {/* Center Spoken Caption / Listening Waveform Card */}
          {(ambientPhase === 'greeting' ||
            ambientPhase === 'listening' ||
            ambientPhase === 'routing' ||
            avatarState === 'speaking' ||
            isUserSpeaking ||
            userTranscriptText) && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-3 sm:p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-500/25 text-[#60a5fa] flex items-center justify-center shrink-0 mt-0.5">
                  {isUserSpeaking ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : ambientPhase === 'listening' ? (
                    <Mic className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  ) : ambientPhase === 'routing' ? (
                    <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isUserSpeaking
                        ? currentLanguage === 'hi'
                          ? 'आप बोल रहे हैं...'
                          : 'You are speaking...'
                        : userTranscriptText && ambientPhase === 'listening'
                        ? currentLanguage === 'hi'
                          ? 'आपने कहा'
                          : 'You said'
                        : ambientPhase === 'listening'
                        ? currentLanguage === 'hi'
                          ? 'सुन रहे हैं...'
                          : 'Listening...'
                        : ambientPhase === 'routing'
                        ? currentLanguage === 'hi'
                          ? 'खोज रहे हैं...'
                          : 'Routing'
                        : avatarState === 'speaking' || ambientPhase === 'greeting'
                        ? currentLanguage === 'hi'
                          ? 'एरिया बोल रही हैं'
                          : 'Aria Speaking'
                        : currentLanguage === 'hi'
                        ? 'तैयार'
                        : 'Ready'}
                    </p>
                    {/* Animated Waveform Bars */}
                    {(ambientPhase === 'greeting' ||
                      ambientPhase === 'listening' ||
                      avatarState === 'speaking' ||
                      isUserSpeaking) && (
                      <div className="flex items-center gap-1 h-3">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <span
                            key={i}
                            className={`wave-bar ${isUserSpeaking ? '!bg-emerald-400' : ''}`}
                            style={{ '--i': i } as React.CSSProperties}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-white leading-snug">
                    {isUserSpeaking
                      ? currentLanguage === 'hi'
                        ? 'आपकी आवाज़ सुन रहे हैं...'
                        : 'Listening to your voice...'
                      : userTranscriptText && avatarState !== 'speaking'
                      ? currentLanguage === 'hi'
                        ? `"${userTranscriptText}"`
                        : `"${userTranscriptText}"`
                      : ambientPhase === 'listening'
                      ? currentLanguage === 'hi'
                        ? 'कृपया बताएं कि मैं आपकी क्या मदद कर सकती हूँ...'
                        : 'Tell me how I can help you today...'
                      : ambientPhase === 'routing'
                      ? currentLanguage === 'hi'
                        ? 'समझ गई, एक क्षण...'
                        : 'Got it, one moment...'
                      : captionText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e8eef5] flex flex-col lg:flex-row font-sans select-none text-[#222222] p-3 lg:p-4 gap-3 lg:gap-4 relative items-stretch">
      {/* ========================================================================= */}
      {/* 1. LEFT COLUMN: ARIA AVATAR & CAPTION STAGE                               */}
      {/* ========================================================================= */}
      <section
        className="flex-1 lg:basis-1/2 lg:w-1/2 h-[40vh] lg:h-full bg-gradient-to-br from-[#181e25] via-[#243342] to-[#2c3e50] rounded-2xl lg:rounded-3xl p-3.5 lg:p-5 text-white flex flex-col justify-between relative shadow-[0_16px_40px_rgba(24,30,37,0.12)] overflow-hidden border border-white/10 shrink-0"
        style={{ '--caption-overlap': '24px' } as React.CSSProperties}
      >
        {/* Top Stage Header */}
        <div className="flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-300 font-display">
              Aria • Clinic AI Avatar
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" />
            <span>Voice & Touch Enabled</span>
          </div>
        </div>

        {/* Container-Query Sized Animated Avatar (Stage root rendered directly as flex child) */}
        <AnimatedAvatar
          state={avatarState}
          avatarName="Aria"
          thinkingMessage={thinkingMessage}
          className=""
        />

        {/* Bottom Live Caption Glass Bar (Overlaps the bottom fade of the avatar) */}
        <div
          className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 lg:p-4 z-30 shadow-lg relative shrink-0"
          style={{ marginTop: 'calc(-1 * var(--caption-overlap, 24px))' }}
        >
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-[#60a5fa] flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isUserSpeaking
                    ? 'You are speaking...'
                    : userTranscriptText && avatarState !== 'speaking'
                    ? 'You said'
                    : avatarState === 'thinking'
                    ? thinkingMessage
                    : 'Aria Speaking'}
                </p>
                {/* CSS Animated Voice Waveform Bars */}
                {(avatarState === 'speaking' || isUserSpeaking) && (
                  <div className="flex items-center gap-1 h-3.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={i}
                        className={`wave-bar ${isUserSpeaking ? '!bg-emerald-400' : ''}`}
                        style={{ '--i': i } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm lg:text-base font-medium text-white leading-snug">
                {userTranscriptText && avatarState !== 'speaking' && !isUserSpeaking
                  ? `"${userTranscriptText}"`
                  : captionText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. RIGHT COLUMN: ACTION PANEL                                              */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 lg:basis-1/2 lg:w-1/2 bg-white/70 backdrop-blur-[16px] backdrop-saturate-[160%] rounded-2xl lg:rounded-3xl p-5 lg:p-6 lg:pr-12 border border-[#e2e8f0] border-t-white/90 flex flex-col justify-between shadow-[0_8px_20px_rgba(24,30,37,0.07)] overflow-hidden relative">
        {/* Header row with Step Progress Dots (Shown for active flows, hidden on Landing IDLE) */}
        {screen !== 'IDLE' && (
          <div className="flex items-center justify-between pb-2">
            <div className="flex flex-col">
              <h2 className="text-lg lg:text-xl font-bold text-[#222222] font-display flex items-center gap-2">
                {(screen === 'FACE_SCAN' || screen === 'VERIFY_CHOICE' || screen === 'FACE_CONSENT') && (
                  <>
                    <ScanFace className="w-5 h-5 text-[#1456f0]" />
                    <span>Face Check-in</span>
                  </>
                )}
                {screen === 'FACE_CONFIRM' && 'Privacy Verification'}
                {screen === 'PHONE' && 'Phone Number Check-in'}
                {screen === 'OTP' && 'Security Code Verification'}
                {screen === 'PATIENT_PICK' && 'Select Patient Profile'}
                {screen === 'DETAILS_SUMMARY' && 'Visit Summary & Room Assignment'}
                {screen === 'ONBOARDING_DETAILS' && 'New Patient Details'}
                {screen === 'ONBOARDING_FACE' && (
                  <>
                    <ScanFace className="w-5 h-5 text-[#1456f0]" />
                    <span>Register your face</span>
                  </>
                )}
                {screen === 'ONBOARDING_REVIEW' && 'Review & Confirm Registration'}
                {screen === 'SERVICE_DOCTOR' && 'Select Service & Provider'}
                {screen === 'TOKEN_ISSUED' && 'Queue Token Issued'}
                {screen === 'MY_VISIT' && 'Active Visit Tracker'}
                {screen === 'DIRECTIONS_CATEGORIES' && (
                  <>
                    <Navigation className="w-5 h-5 text-[#1456f0]" />
                    <span>Clinic Wayfinding & Directions</span>
                  </>
                )}
                {screen === 'DIRECTIONS_ROOMS' && (
                  <>
                    <MapPin className="w-5 h-5 text-[#1456f0]" />
                    <span>{selectedDirectionCategory?.name || 'Department Rooms'}</span>
                  </>
                )}
                {screen === 'DIRECTIONS_RESULT' && (
                  <>
                    <Compass className="w-5 h-5 text-[#1456f0]" />
                    <span>Directions & Location</span>
                  </>
                )}
              </h2>
              <p className="text-sm text-[#64748b] mt-0.5">
                {(screen === 'FACE_SCAN' || screen === 'VERIFY_CHOICE' || screen === 'FACE_CONSENT') &&
                  (currentLanguage === 'en'
                    ? 'Look into the camera. Your image is not saved.'
                    : 'कैमरे में देखें। आपकी छवि सहेजी नहीं गई है।')}
                {screen === 'FACE_CONFIRM' &&
                  (currentLanguage === 'en'
                    ? 'Please confirm your identity to reveal clinical details.'
                    : 'कृपया पहचान की पुष्टि करें।')}
                {screen === 'PHONE' &&
                  (currentLanguage === 'en'
                    ? 'Enter your registered 10-digit mobile phone number.'
                    : 'अपना पंजीकृत 10-अंकीय मोबाइल नंबर दर्ज करें।')}
                {screen === 'DETAILS_SUMMARY' && 'Summary retrieved directly from clinic system.'}
                {screen === 'ONBOARDING_FACE' && 'Next time, check in with just a look.'}
                {screen === 'ONBOARDING_REVIEW' && 'Review details before registering.'}
                {screen === 'DIRECTIONS_CATEGORIES' && 'Select a department to view available rooms and directions.'}
                {screen === 'DIRECTIONS_ROOMS' && 'Select a room or station to view walking directions.'}
                {screen === 'DIRECTIONS_RESULT' && 'Step-by-step navigation from reception.'}
              </p>
            </div>

            {/* Step Dots indicator */}
            {stepProgress && (
              <div className="flex items-center gap-2 bg-slate-100/80 px-3.5 py-1.5 rounded-full border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">
                  Step {stepProgress.current} of {stepProgress.total}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: stepProgress.total }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx + 1 === stepProgress.current
                          ? 'w-5 bg-[#1456f0]'
                          : idx + 1 < stepProgress.current
                          ? 'w-2 bg-[#10b981]'
                          : 'w-2 bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error / Alert banner if present */}
        {errorMessage && (
          <div className="my-2 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-sm text-red-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* LANDING SCREEN (Home: 3 Large Glass Quick Action Cards)               */}
        {/* ===================================================================== */}
        {screen === 'IDLE' && (
          <div className="flex-1 w-full h-full flex flex-col justify-between py-2 min-h-0 animate-in fade-in duration-300">
            {/* Welcome Header */}
            <div className="text-center sm:text-left pt-2 pb-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#181e25] tracking-tight font-display">
                Welcome to MantraCare
              </h2>
              <p className="text-base sm:text-lg text-[#475569] mt-1.5 font-medium">
                Fast, contactless check-in, walk-in registration, and interactive clinic wayfinding.
              </p>
            </div>

            {/* Four Large Clinical Glass Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 my-auto py-2">
              {/* 1. I Have an Appointment */}
              <button
                onClick={() => {
                  handleUserActivity();
                  setFlowType('SCHEDULED');
                  setScreen('FACE_SCAN');
                  navigate('/reception/appointment');
                  speak(
                    currentLanguage === 'hi'
                      ? 'कृपया चेक इन करने के लिए कैमरे में देखें या फोन नंबर दर्ज करें।'
                      : 'Please look into the camera to check in, or use your phone number below.'
                  );
                }}
                className="group text-left p-5 lg:p-6 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-6 -mt-6" />
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold tracking-wide uppercase border border-blue-200/60">
                      Scheduled
                    </span>
                  </div>

                  <h3 className="text-lg lg:text-xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    I Have an Appointment
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748b] mt-1.5 leading-relaxed line-clamp-2">
                    Instant face recognition or phone lookup for pre-booked visits.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Touch to Check In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* 2. I'm a Walk-in Patient */}
              <button
                onClick={() => {
                  handleUserActivity();
                  setFlowType('WALK_IN');
                  setScreen('PHONE');
                  navigate('/reception/walk-in');
                  speak(
                    currentLanguage === 'hi'
                      ? 'स्वागत है! पंजीकरण शुरू करने के लिए अपना फोन नंबर दर्ज करें।'
                      : 'Welcome! Please enter your mobile phone number on the touch keypad to begin registration.'
                  );
                }}
                className="group text-left p-5 lg:p-6 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-6 -mt-6" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold tracking-wide uppercase border border-blue-200/60">
                      Walk-in
                    </span>
                  </div>

                  <h3 className="text-lg lg:text-xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    I'm a Walk-in Patient
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748b] mt-1.5 leading-relaxed line-clamp-2">
                    Register without an appointment, pick your doctor, and get a token.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Start Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* 3. Pay My Bill */}
              <button
                onClick={() => {
                  handleUserActivity();
                  setFlowType('PAYMENT');
                  setScreen('PHONE');
                  navigate('/reception/billing');
                  speak(
                    currentLanguage === 'hi'
                      ? 'कृपया अपना बिल और बकाया देखने के लिए अपना मोबाइल नंबर दर्ज करें।'
                      : 'Please enter your mobile phone number on the touch keypad to look up your bill.'
                  );
                }}
                className="group text-left p-5 lg:p-6 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-6 -mt-6" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold tracking-wide uppercase border border-blue-200/60">
                      Billing
                    </span>
                  </div>

                  <h3 className="text-lg lg:text-xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    Pay My Bill
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748b] mt-1.5 leading-relaxed line-clamp-2">
                    Quick payment lookup, invoice settlement, and digital receipts.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Pay or View Dues</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* 4. Get Directions (Wayfinding) */}
              <button
                onClick={() => handleOpenDirections()}
                className="group text-left p-5 lg:p-6 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-6 -mt-6" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold tracking-wide uppercase border border-blue-200/60">
                      Wayfinding
                    </span>
                  </div>

                  <h3 className="text-lg lg:text-xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    Get Directions
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748b] mt-1.5 leading-relaxed line-clamp-2">
                    Browse doctor rooms, pharmacy, labs, restrooms, and facility directions.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Browse Locations</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Bottom Quick Help Notice */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/60 border border-slate-200/80 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Need assistance? Tap <strong>Call Staff</strong> in the right sidebar anytime.</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FACE RECOGNITION SCANNER                                              */}
        {/* ===================================================================== */}
        {(screen === 'FACE_SCAN' || screen === 'VERIFY_CHOICE' || screen === 'FACE_CONSENT') && (
          <div className="face-stage">
            <div className="face-camera">
              {/* Live Webcam Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Top-Left State Badge */}
              <div className="absolute top-4 left-4 z-30 pointer-events-none">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-lg">
                  {facePhase === 'idle' && (
                    <>
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>{currentLanguage === 'en' ? 'Ready' : 'तैयार'}</span>
                    </>
                  )}
                  {facePhase === 'starting' && (
                    <>
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      <span>{currentLanguage === 'en' ? 'Starting' : 'प्रारंभ'}</span>
                    </>
                  )}
                  {facePhase === 'scanning' && (
                    <>
                      <ScanFace className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>{currentLanguage === 'en' ? 'Scanning' : 'स्कैनिंग'}</span>
                    </>
                  )}
                  {facePhase === 'success' && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{currentLanguage === 'en' ? 'Verified' : 'सत्यापित'}</span>
                    </>
                  )}
                  {facePhase === 'no_match' && (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                      <span>{currentLanguage === 'en' ? 'Try again' : 'पुनः प्रयास'}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Live Hint Pill at Top Center */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div
                  className={`py-1.5 px-4 rounded-full text-center border backdrop-blur-xl shadow-lg flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isAligned || facePhase === 'success'
                      ? 'bg-emerald-950/85 border-emerald-400/40 text-emerald-300 shadow-emerald-500/20'
                      : 'bg-slate-900/85 border-white/20 text-white'
                  }`}
                >
                  {isAligned || facePhase === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse shrink-0" />
                  )}
                  <span>{dynamicHintText}</span>
                </div>
              </div>

              {/* ONE SHARED GUIDE BOX, absolutely centered inside card */}
              <div className="face-guide-area">
                <div className="face-guide">
                  {/* 4 Crisp Corner Brackets exactly on guide box corners */}
                  <div
                    className={`absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-xl transition-colors duration-200 ${
                      isAligned || facePhase === 'success' ? 'border-[#10b981]' : 'border-[#3b82f6]'
                    }`}
                  />
                  <div
                    className={`absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-xl transition-colors duration-200 ${
                      isAligned || facePhase === 'success' ? 'border-[#10b981]' : 'border-[#3b82f6]'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-xl transition-colors duration-200 ${
                      isAligned || facePhase === 'success' ? 'border-[#10b981]' : 'border-[#3b82f6]'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-xl transition-colors duration-200 ${
                      isAligned || facePhase === 'success' ? 'border-[#10b981]' : 'border-[#3b82f6]'
                    }`}
                  />

                  {/* Dashed Oval with Soft Navy Dimmed Layer outside */}
                  <div
                    className={`w-full h-full border-[3px] border-dashed transition-all duration-200 relative flex items-center justify-center ${
                      isAligned || facePhase === 'success'
                        ? 'border-[#10b981] shadow-[0_0_24px_rgba(16,185,129,0.50),0_0_0_9999px_rgba(24,30,37,0.45)]'
                        : facePhase === 'no_match'
                        ? 'border-blue-400 shadow-[0_0_0_9999px_rgba(24,30,37,0.45)]'
                        : 'border-[#3b82f6] shadow-[0_0_0_9999px_rgba(24,30,37,0.45)]'
                    }`}
                    style={{ borderRadius: '50% / 45%' }}
                  >
                    {/* Animated Scan Laser Line & Ring: ONLY during 'scanning' phase */}
                    {facePhase === 'scanning' && (
                      <>
                        <div
                          className="absolute inset-0 border-2 border-sky-400/60 animate-pulse shadow-[0_0_20px_rgba(56,189,248,0.5)]"
                          style={{ borderRadius: '50% / 45%' }}
                        />
                        <div className="absolute left-6 right-6 h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_16px_#38bdf8] animate-pulse" />
                      </>
                    )}

                    {/* Starting Phase: 3-2-1 Countdown */}
                    {facePhase === 'starting' && (
                      <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200 pointer-events-auto">
                        <span className="text-7xl lg:text-8xl font-black font-display text-white drop-shadow-[0_8px_24px_rgba(24,30,37,0.8)] animate-pulse">
                          {countdown}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-blue-300 mt-2">
                          {currentLanguage === 'en' ? 'Starting scan...' : 'स्कैन प्रारंभ...'}
                        </span>
                      </div>
                    )}

                    {/* Success Phase Indicator inside oval */}
                    {facePhase === 'success' && (
                      <div className="flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-md rounded-3xl p-6 border border-emerald-400/40 animate-in zoom-in-90 duration-300 pointer-events-auto shadow-2xl max-w-xs mx-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 flex items-center justify-center mb-2">
                          <CheckCircle2 className="w-9 h-9" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-400/30">
                          {currentLanguage === 'en'
                            ? `Verified ${(faceConfidence * 100).toFixed(0)}% Match`
                            : `सत्यापित ${(faceConfidence * 100).toFixed(0)}% मिलान`}
                        </span>
                        <h3 className="text-xl font-bold text-white font-display mt-2 text-center">
                          {currentLanguage === 'en'
                            ? `Hi ${matchedCandidateName}, is this you?`
                            : `नमस्ते ${matchedCandidateName}, क्या यह आप हैं?`}
                        </h3>
                        <p className="text-xs text-emerald-100/80 mt-0.5 text-center">
                          {currentLanguage === 'en'
                            ? 'Confirm identity to view clinic details'
                            : 'विवरण देखने के लिए पहचान की पुष्टि करें'}
                        </p>
                        <div className="flex items-center gap-3 mt-4 w-full">
                          <button
                            onClick={handleFaceConfirmYes}
                            className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-sm font-bold shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[48px]"
                          >
                            <Check className="w-4 h-4" />
                            <span>{currentLanguage === 'en' ? "Yes, that's me" : 'हाँ, यह मैं हूँ'}</span>
                          </button>
                          <button
                            onClick={handleFaceConfirmNo}
                            className="px-4 py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-semibold backdrop-blur-sm transition-all cursor-pointer min-h-[48px]"
                          >
                            {currentLanguage === 'en' ? 'No' : 'नहीं'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* No Match Phase inside oval */}
                    {facePhase === 'no_match' && (
                      <div className="flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-blue-400/40 text-center max-w-xs animate-in zoom-in-90 duration-300 pointer-events-auto shadow-2xl mx-4">
                        <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/40 flex items-center justify-center mb-2">
                          <AlertCircle className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-bold text-white font-display">
                          {currentLanguage === 'en' ? 'No match found' : 'कोई मिलान नहीं मिला'}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">
                          {faceAttempts >= 3
                            ? currentLanguage === 'en'
                              ? 'Multiple attempts reached. Please use phone number check-in.'
                              : 'अधिकतम प्रयास पूर्ण। कृपया फ़ोन नंबर से चेक-इन करें।'
                            : currentLanguage === 'en'
                            ? 'We could not recognize your face. Please try again or use your phone number.'
                            : 'चेहरा पहचाना नहीं जा सका। पुनः प्रयास करें या फ़ोन नंबर का उपयोग करें।'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* .face-dock floating over bottom edge of camera card */}
            {facePhase !== 'success' && (
              <div className="face-dock">
                {facePhase === 'idle' && (
                  <button className="dock-btn dock-primary" onClick={startScanning}>
                    <Camera size={20} />
                    <span>{currentLanguage === 'en' ? 'Start scanning' : 'स्कैन शुरू करें'}</span>
                  </button>
                )}

                {facePhase === 'starting' && (
                  <button className="dock-btn dock-primary" disabled>
                    <Clock size={20} className="animate-spin" />
                    <span>{currentLanguage === 'en' ? 'Starting...' : 'प्रारंभ हो रहा है...'}</span>
                  </button>
                )}

                {facePhase === 'scanning' && (
                  <button className="dock-btn dock-cancel" onClick={cancelScanning}>
                    <X size={20} />
                    <span>{currentLanguage === 'en' ? 'Cancel scanning' : 'स्कैन रद्द करें'}</span>
                  </button>
                )}

                {facePhase === 'no_match' && (
                  <>
                    {faceAttempts < 3 ? (
                      <button className="dock-btn dock-primary" onClick={startScanning}>
                        <RefreshCw size={20} />
                        <span>{currentLanguage === 'en' ? 'Try again' : 'पुनः प्रयास करें'}</span>
                      </button>
                    ) : (
                      <button
                        className="dock-btn dock-primary"
                        onClick={() => {
                          stopCameraStream();
                          startPhoneVerification();
                        }}
                      >
                        <Phone size={20} />
                        <span>{currentLanguage === 'en' ? 'Use phone number instead' : 'फ़ोन नंबर से चेक-इन करें'}</span>
                        <ArrowRight size={20} />
                      </button>
                    )}
                  </>
                )}

                {(facePhase !== 'no_match' || faceAttempts < 3) && (
                  <button
                    className="dock-btn dock-ghost"
                    onClick={() => {
                      stopCameraStream();
                      startPhoneVerification();
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Phone size={20} />
                      <span>{currentLanguage === 'en' ? 'Use phone number instead' : 'फ़ोन नंबर से चेक-इन करें'}</span>
                    </span>
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* FACE PRIVACY CONFIRMATION GATE                                        */}
        {/* ===================================================================== */}
        {screen === 'FACE_CONFIRM' && (
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="max-w-md w-full bg-white rounded-3xl border-2 border-emerald-200 p-6 shadow-lg space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Match Confidence: {(faceConfidence * 100).toFixed(0)}%
                </span>
                <h3 className="text-xl font-bold text-[#222222] font-display pt-2">
                  Hi {matchedCandidateName}, is this you?
                </h3>
                <p className="text-sm text-[#64748b]">
                  For clinical privacy, details will only be displayed after you confirm.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleFaceConfirmYes}
                  className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
                >
                  <Check className="w-4 h-4" />
                  <span>Yes, that's me</span>
                </button>
                <button
                  onClick={() => {
                    setScreen('VERIFY_CHOICE');
                    setSelectedPatient(null);
                  }}
                  className="flex-1 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors cursor-pointer min-h-[var(--touch,60px)]"
                >
                  No, not me
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* PHONE NUMBER KEYPAD                                                   */}
        {/* ===================================================================== */}
        {screen === 'PHONE' && (
          <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full py-2">
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                  {currentLanguage === 'en'
                    ? 'Enter Mobile Phone Number'
                    : 'मोबाइल फ़ोन नंबर दर्ज करें'}
                </label>
                <div className="h-[var(--touch,60px)] min-h-[56px] px-4 rounded-2xl bg-white border-2 border-[#e2e8f0] focus-within:border-[#1456f0] flex items-center justify-between shadow-2xs">
                  <span className="text-xl font-mono font-bold text-[#222222] tracking-wider">
                    {phoneNumber || (
                      <span className="text-slate-300 font-normal">e.g. 9876543210</span>
                    )}
                  </span>
                  {phoneNumber && (
                    <button
                      onClick={() => setPhoneNumber('')}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Numerical Touch Keypad */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleKeypadPress(val)}
                    className="h-[var(--touch,60px)] min-h-[56px] rounded-xl bg-white border border-[#e2e8f0] hover:bg-blue-50/50 hover:border-blue-300 text-2xl font-bold text-[#222222] shadow-2xs transition-colors cursor-pointer flex items-center justify-center font-display"
                  >
                    {val === 'BACK' ? '⌫' : val === 'CLEAR' ? 'C' : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Same dock buttons on Phone screen */}
            <div className="flex flex-col gap-2 p-2 rounded-[32px] bg-white/72 backdrop-blur-[16px] backdrop-saturate-[160%] border border-[#e2e8f0] border-t-white/90 shadow-[0_16px_40px_rgba(24,30,37,0.18)] mt-3">
              <button
                className="dock-btn dock-primary"
                onClick={handleSendOtp}
                disabled={!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7}
              >
                <span>{currentLanguage === 'en' ? 'Continue & Send Code' : 'जारी रखें और कोड भेजें'}</span>
                <ArrowRight size={20} />
              </button>
              <button
                className="dock-btn dock-ghost"
                onClick={handleResetSession}
              >
                <span className="flex items-center gap-2.5">
                  <ScanFace size={20} />
                  <span>{currentLanguage === 'en' ? 'Use face check-in instead' : 'चेहरे से चेक-इन करें'}</span>
                </span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* OTP VERIFICATION KEYPAD                                               */}
        {/* ===================================================================== */}
        {screen === 'OTP' && (
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-2 text-center">
            <p className="text-sm text-[#64748b] mb-1 font-medium">
              Enter 4-digit code sent to <span className="font-semibold text-slate-800">{phoneNumber}</span>
            </p>
            <span className="text-xs font-bold text-[#1456f0] bg-blue-50 px-3 py-0.5 rounded-full inline-block mx-auto mb-3 border border-blue-200">
              Demo Mode: Enter 1 2 3 4
            </span>

            {/* 4 OTP Input Boxes */}
            <div className="flex justify-center gap-3 mb-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-14 h-[var(--touch,60px)] min-h-[56px] rounded-2xl bg-white border-2 flex items-center justify-center text-2xl font-mono font-bold shadow-2xs ${
                    otp.length === idx
                      ? 'border-[#1456f0] ring-2 ring-blue-500/20'
                      : otp.length > idx
                      ? 'border-emerald-500 text-emerald-700'
                      : 'border-[#e2e8f0] text-slate-300'
                  }`}
                >
                  {otp[idx] || '•'}
                </div>
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((val) => (
                <button
                  key={val}
                  onClick={() => handleOtpPress(val)}
                  className="h-[var(--touch,60px)] min-h-[56px] rounded-xl bg-white border border-[#e2e8f0] hover:bg-blue-50/50 hover:border-blue-300 text-2xl font-bold text-[#222222] shadow-2xs transition-colors cursor-pointer flex items-center justify-center font-display"
                >
                  {val === 'BACK' ? '⌫' : val === 'CLEAR' ? 'C' : val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FAMILY PATIENT PICKER                                                 */}
        {/* ===================================================================== */}
        {screen === 'PATIENT_PICK' && (
          <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 space-y-3">
            <p className="text-sm text-[#64748b] text-center mb-2 font-medium">
              Multiple family members share this number. Please select who is checking in:
            </p>
            <div className="space-y-2">
              {patients.map((pat) => (
                <button
                  key={pat.id}
                  onClick={() => handleSelectFamilyPatient(pat)}
                  className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#1456f0] hover:bg-blue-50/30 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs min-h-[var(--touch,60px)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-[#1456f0] font-bold flex items-center justify-center font-display text-base">
                      {pat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#222222] font-display">{pat.name}</h4>
                      <p className="text-sm text-slate-500">
                        Age: {pat.age || '—'} • Gender: {pat.gender || '—'} • {pat.relation || 'Self'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* THREE-CARD VISIT DETAILS SUMMARY (Full-Screen Vertical Stack)          */}
        {/* ===================================================================== */}
        {screen === 'DETAILS_SUMMARY' && visitSummary && (
          <div className="flex-1 flex flex-col justify-between max-w-[680px] mx-auto w-full py-2 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex flex-col space-y-3.5 flex-1 justify-center">
              {/* Card 1: Patient Profile & Identity */}
              <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(24,30,37,0.05)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display block">
                    Patient Profile
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                    {visitSummary.patient.name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {visitSummary.patient.age} yrs • {visitSummary.patient.gender} • Mobile: <span className="font-mono text-slate-800 font-semibold">{visitSummary.patient.maskedPhone}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
                    ID: {visitSummary.patient.id}
                  </span>
                </div>
              </div>

              {/* Card 2: Scheduled Appointment & Doctor */}
              <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border-2 border-blue-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(20,86,240,0.06)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display block">
                    Scheduled Appointment
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-950 font-display">
                    {visitSummary.appointment.serviceName}
                  </h3>
                  <p className="text-sm text-slate-700 font-medium">
                    {visitSummary.appointment.providerName} • {visitSummary.appointment.date} @ {visitSummary.appointment.time}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Confirmed
                  </span>
                </div>
              </div>

              {/* Card 3: Clinic Station, Room & Directions */}
              <div className="bg-gradient-to-br from-blue-50/80 via-blue-100/40 to-indigo-50/50 rounded-2xl sm:rounded-3xl border-2 border-blue-200 p-5 sm:p-6 shadow-[0_4px_20px_rgba(20,86,240,0.06)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 font-display block">
                    Station & Room Assignment
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-950 font-display">
                    {visitSummary.room.roomName}
                  </h3>
                  <p className="text-sm text-slate-700">
                    {visitSummary.room.floorWing} • 📍 {visitSummary.room.directions}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="text-xs font-semibold text-slate-500 block">Est. Wait</span>
                  <span className="text-lg font-bold text-blue-700 font-mono">~{visitSummary.room.estimatedWaitMin} min</span>
                </div>
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmCheckin}
                className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Confirm check-in & Print Token</span>
              </button>
              <button
                onClick={handleResetSession}
                className="px-8 h-14 rounded-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Not me
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* NEW PATIENT ONBOARDING - STEP 1 DETAILS                                */}
        {/* ===================================================================== */}
        {screen === 'ONBOARDING_DETAILS' && (
          <div className="flex-1 flex flex-col justify-center max-w-[560px] mx-auto w-full py-4 space-y-4 animate-in fade-in duration-200">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_8px_30px_rgba(24,30,37,0.06)] space-y-4">
              {/* Full Legal Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Full Legal Name *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={onboardingForm.name}
                    onFocus={() => { activeFocusedFieldRef.current = 'name'; }}
                    onBlur={() => { activeFocusedFieldRef.current = null; }}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                    placeholder="e.g. Sunita Rao"
                    className="w-full h-14 px-4.5 pr-14 rounded-2xl border-2 border-slate-200/85 bg-white text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1456f0] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                  {isSpeechRecognitionSupported && (
                    <button
                      type="button"
                      onClick={() => startDictation('name')}
                      title="Dictate Full Name"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDictationField === 'name'
                          ? 'bg-blue-100 text-[#1456f0] ring-4 ring-blue-500/20 animate-pulse'
                          : dictationSuccessField === 'name'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'text-[#64748b] hover:text-[#1456f0] hover:bg-blue-50/60'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Age / Date of Birth
                  </label>
                  <input
                    type="number"
                    value={onboardingForm.age}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, age: Number(e.target.value) })}
                    className="w-full h-14 px-4.5 rounded-2xl border-2 border-slate-200/85 bg-white text-lg font-medium font-mono text-slate-900 focus:border-[#1456f0] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={onboardingForm.gender}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, gender: e.target.value })}
                    className="w-full h-14 px-4.5 rounded-2xl border-2 border-slate-200/85 bg-white text-lg font-medium text-slate-900 focus:border-[#1456f0] focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer transition-all"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={onboardingForm.email}
                  onFocus={() => { activeFocusedFieldRef.current = 'email'; }}
                  onBlur={() => { activeFocusedFieldRef.current = null; }}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full h-14 px-4.5 rounded-2xl border-2 border-slate-200/85 bg-white text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1456f0] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Reason for Visit
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={onboardingForm.reason}
                    onFocus={() => { activeFocusedFieldRef.current = 'reason'; }}
                    onBlur={() => { activeFocusedFieldRef.current = null; }}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, reason: e.target.value })}
                    placeholder="e.g. General checkup, Fever"
                    className="w-full h-14 px-4.5 pr-14 rounded-2xl border-2 border-slate-200/85 bg-white text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1456f0] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                  {isSpeechRecognitionSupported && (
                    <button
                      type="button"
                      onClick={() => startDictation('reason')}
                      title="Dictate Reason for Visit"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDictationField === 'reason'
                          ? 'bg-blue-100 text-[#1456f0] ring-4 ring-blue-500/20 animate-pulse'
                          : dictationSuccessField === 'reason'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'text-[#64748b] hover:text-[#1456f0] hover:bg-blue-50/60'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-2">
                <button
                  onClick={handleOnboardingStep1Next}
                  className="w-full h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{onboardingForm.age < 18 ? 'Next: Review Registration' : 'Next: Face Registration'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ONBOARDING - STEP 2 FACE REGISTRATION                                 */}
        {/* ===================================================================== */}
        {screen === 'ONBOARDING_FACE' && (
          <>
            {/* SUB-STATE 1: INTRO STATE (Full-screen vertically centered) */}
            {faceRegPhase === 'intro' && (
              <div className="flex-1 flex flex-col justify-center max-w-[620px] mx-auto w-full py-4 space-y-6 animate-in fade-in duration-200">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/15 via-blue-600/10 to-indigo-500/10 text-[#1456f0] border-2 border-blue-200 flex items-center justify-center mx-auto shadow-md shadow-blue-500/10">
                    <ScanFace className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#181e25] font-display tracking-tight">
                      Faster Check-in at Future Visits
                    </h3>
                    <p className="text-sm sm:text-base text-[#64748b] max-w-md mx-auto mt-2 leading-relaxed">
                      Enable autonomous face check-in so you can walk up and check in with just a glance next time.
                    </p>
                  </div>
                </div>

                {/* Informed Consent Card */}
                <div className="p-6 bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgba(24,30,37,0.06)] space-y-2.5">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-base font-display">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Biometric Privacy & Consent</span>
                  </div>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    We save an encrypted biometric vector template with your patient record so our reception camera can recognize you on return visits. We do not store raw photos or share your biometrics. You may revoke consent anytime.
                  </p>
                </div>

                {/* Two Equal Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <button
                    onClick={handleStartFaceRegistration}
                    className="h-14 px-6 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Register my face</span>
                  </button>
                  <button
                    onClick={handleSkipFaceRegistration}
                    className="h-14 px-6 rounded-full bg-white/90 hover:bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-base font-semibold shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Skip for now</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STATE 2: LIVE 3-SAMPLE CAPTURE STATE (Identical treatment to FACE_SCAN) */}
            {faceRegPhase === 'capturing' && (
              <div className="face-stage">
                <div className="face-camera">
                  {/* Live Webcam Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {/* Top-Left Sample Indicator Badge */}
                  <div className="absolute top-4 left-4 z-30 pointer-events-none">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-lg">
                      <ScanFace className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>Sample {regSampleIndex + 1} of 3</span>
                    </div>
                  </div>

                  {/* Top-Center Compact Glass 3-Sample Progress Pills */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-lg">
                      {[
                        { idx: 0, label: 'Front' },
                        { idx: 1, label: 'Left' },
                        { idx: 2, label: 'Right' },
                      ].map((s) => (
                        <div key={s.idx} className="flex items-center gap-1.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                              regSampleIndex > s.idx
                                ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                                : regSampleIndex === s.idx
                                ? 'bg-[#1456f0] ring-2 ring-blue-400 animate-pulse'
                                : 'bg-white/30'
                            }`}
                          />
                          <span
                            className={`${
                              regSampleIndex === s.idx
                                ? 'text-white font-bold'
                                : regSampleIndex > s.idx
                                ? 'text-emerald-300 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            {s.label}
                          </span>
                          {s.idx < 2 && <span className="text-white/20 text-xs">•</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Hint Pill at Top Center (below progress pills) */}
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="py-1.5 px-4 rounded-full text-center border backdrop-blur-xl shadow-lg flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 bg-slate-900/85 border-white/20 text-white">
                      <Eye className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse shrink-0" />
                      <span>{regHint}</span>
                    </div>
                  </div>

                  {/* ONE SHARED GUIDE BOX, absolutely centered inside card */}
                  <div className="face-guide-area">
                    <div className="face-guide">
                      {/* 4 Crisp Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-xl border-[#3b82f6]" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-xl border-[#3b82f6]" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-xl border-[#3b82f6]" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-xl border-[#3b82f6]" />

                      {/* Dashed Oval with Dimmed Background */}
                      <div
                        className="w-full h-full border-[3px] border-dashed border-[#3b82f6] shadow-[0_0_0_9999px_rgba(24,30,37,0.45)] relative flex items-center justify-center"
                        style={{ borderRadius: '50% / 45%' }}
                      >
                        <div
                          className="absolute inset-0 border-2 border-sky-400/60 animate-pulse shadow-[0_0_20px_rgba(56,189,248,0.5)]"
                          style={{ borderRadius: '50% / 45%' }}
                        />
                        <div className="absolute left-6 right-6 h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_16px_#38bdf8] animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Glass Dock at bottom edge of camera card */}
                <div className="face-dock">
                  <button className="dock-btn dock-cancel" onClick={handleSkipFaceRegistration}>
                    <X size={20} />
                    <span>Skip face registration</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STATE 3: DUPLICATE PROMPT STATE */}
            {faceRegPhase === 'duplicate_found' && duplicateCandidate && (
              <div className="flex-1 flex flex-col justify-center max-w-[560px] mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-200">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-blue-300 p-7 shadow-xl space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
                    <ScanFace className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      Existing Record Detected
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 font-display pt-2">
                      It looks like you may already be registered. Is your name {duplicateCandidate.name.split(' ')[0]}?
                    </h3>
                    <p className="text-sm text-slate-500">
                      We matched your face with an existing patient profile in the clinic system.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                    <button
                      onClick={handleDuplicateConfirmYes}
                      className="w-full sm:flex-1 h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Yes, that's me</span>
                    </button>
                    <button
                      onClick={handleDuplicateConfirmNo}
                      className="w-full sm:flex-1 h-14 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      No, continue as new
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STATE 4: SUCCESS STATE */}
            {faceRegPhase === 'success' && (
              <div className="flex-1 flex flex-col justify-center max-w-[560px] mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-200">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-emerald-300 p-8 shadow-xl space-y-5">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Face registered
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900 font-display pt-2">
                      Ready for Faster Check-in
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      Your biometric template is prepared and will be saved with your registration.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleContinueToReview}
                      className="w-full h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue to Review</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STATE 5: CAMERA DENIED */}
            {faceRegPhase === 'denied' && (
              <div className="flex-1 flex flex-col justify-center max-w-[560px] mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-200">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-slate-200 p-7 shadow-md space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 font-display">Camera Unavailable</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Camera access was not granted. You can continue registration without face check-in.
                    </p>
                  </div>
                  <button
                    onClick={handleSkipFaceRegistration}
                    className="w-full h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Continue to Review</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================================== */}
        {/* ONBOARDING - STEP 3 HUMAN-CONFIRMATION GATE                           */}
        {/* ===================================================================== */}
        {screen === 'ONBOARDING_REVIEW' && (
          <div className="flex-1 flex flex-col justify-center max-w-[660px] mx-auto w-full py-4 space-y-5 animate-in fade-in duration-200">
            <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(24,30,37,0.06)] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display block">
                    Walk-in Patient
                  </span>
                  <h3 className="text-lg font-bold text-[#181e25] font-display">
                    Patient Registration Summary
                  </h3>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                  MantraAssist Intake
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">Full Legal Name:</span>
                  <span className="text-base font-bold text-slate-900">{onboardingForm.name}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">Phone Number:</span>
                  <span className="text-base font-mono font-bold text-slate-900">{phoneNumber || '—'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">Age & Gender:</span>
                  <span className="text-base font-bold text-slate-900">{onboardingForm.age} yrs • {onboardingForm.gender}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">Face Check-in Status:</span>
                  <span className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${onboardingForm.faceCheckinNextTime ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {onboardingForm.faceCheckinNextTime ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Enrolled (Consent on file)</span>
                      </>
                    ) : (
                      onboardingForm.age < 18 ? 'Not available (under 18)' : 'Skipped for now'
                    )}
                  </span>
                </div>
              </div>

              {onboardingForm.email && (
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 text-sm">
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">Email Address:</span>
                  <span className="font-semibold text-slate-800">{onboardingForm.email}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-blue-600 block">Assigned Clinic Journey:</span>
                  <span className="font-bold text-blue-950">Walk-in Consultation & Queue Ticket</span>
                </div>
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
            </div>

            {/* Action Buttons: Approve / Edit / Decline */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleOnboardingApprove}
                className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Approve Registration</span>
              </button>

              <button
                onClick={() => setScreen('ONBOARDING_DETAILS')}
                className="px-6 h-14 rounded-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>

              <button
                onClick={handleResetSession}
                className="px-6 h-14 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-bold text-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SERVICE & DOCTOR SELECTION (Two-Step Reveal, Vertical Column)         */}
        {/* ===================================================================== */}
        {screen === 'SERVICE_DOCTOR' && (
          <div className="flex-1 flex flex-col justify-center max-w-[680px] mx-auto w-full py-4 space-y-5 animate-in fade-in duration-200">
            {/* Step A: Choose Service (Vertical single column) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">
                  Step 1: Choose Service
                </label>
                {selectedServiceId && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected
                  </span>
                )}
              </div>
              <div className="flex flex-col space-y-3">
                {services.map((srv) => {
                  const isSelected = selectedServiceId === srv.id;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => {
                        setSelectedServiceId(srv.id);
                        setSelectedProviderId('next_available');
                      }}
                      className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all duration-200 cursor-pointer min-h-[72px] ${
                        isSelected
                          ? 'border-[#1456f0] bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200/90 bg-white hover:border-blue-200 hover:bg-slate-50/60 shadow-xs'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 font-display leading-tight">{srv.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Duration: {srv.durationMin} min • Category: {srv.category || 'General'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-base font-bold text-slate-900 font-mono">₹{srv.basePrice || 500}</span>
                        {isSelected ? (
                          <CheckCircle className="w-6 h-6 text-[#1456f0]" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step B: Provider Assignment (Smooth 240ms Ease-out Transition, Vertical single column) */}
            <div
              className={`transition-all duration-[240ms] ease-out motion-reduce:transition-none ${
                selectedServiceId
                  ? 'opacity-100 max-h-[500px] translate-y-0'
                  : 'opacity-0 max-h-0 -translate-y-2 pointer-events-none overflow-hidden'
              }`}
            >
              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider font-display mb-2.5">
                  Step 2: Provider Assignment
                </label>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => setSelectedProviderId('next_available')}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-center justify-between min-h-[64px] ${
                      selectedProviderId === 'next_available'
                        ? 'border-[#1456f0] bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-base font-bold text-slate-900 font-display">⚡ Next Available</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Shortest estimated queue wait time</p>
                    </div>
                    {selectedProviderId === 'next_available' ? (
                      <CheckCircle className="w-5 h-5 text-[#1456f0] shrink-0 ml-2" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 ml-2" />
                    )}
                  </button>

                  {providers.slice(0, 3).map((prov) => {
                    const isSelected = selectedProviderId === prov.id;
                    return (
                      <button
                        key={prov.id}
                        onClick={() => setSelectedProviderId(prov.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-center justify-between min-h-[64px] ${
                          isSelected
                            ? 'border-[#1456f0] bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200/90 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <h4 className="text-base font-bold text-slate-900 font-display">{prov.name}</h4>
                          {isSelected && <CheckCircle className="w-4 h-4 text-[#1456f0]" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {prov.specialization || prov.specialty || 'Consulting Physician'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirm & Issue Queue Ticket */}
            <div className="pt-2">
              <button
                onClick={handleBookWalkIn}
                disabled={!selectedServiceId || !selectedProviderId}
                className={`w-full h-14 rounded-full text-base font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedServiceId && selectedProviderId
                    ? 'bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Confirm & Issue Queue Ticket</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TOKEN ISSUED SCREEN                                                   */}
        {/* ===================================================================== */}
        {screen === 'TOKEN_ISSUED' && issuedTicket && (
          <div className="flex-1 flex flex-col justify-center items-center py-2 text-center max-w-md mx-auto w-full">
            <div className="w-full bg-white rounded-3xl border-2 border-emerald-300 p-6 shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <Ticket className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Visit Token Confirmed
                </span>
                <div className="text-4xl lg:text-5xl font-extrabold text-slate-900 font-mono tracking-tight my-2">
                  {issuedTicket.tokenLabel}
                </div>
                <p className="text-base font-bold text-slate-800 font-display">
                  {issuedTicket.stationName}
                </p>
                <p className="text-sm text-slate-500">
                  Estimated Wait: ~{issuedTicket.estimatedWaitMin || 8} min
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-600 text-left space-y-1.5">
                <p className="font-semibold text-slate-800">What to do next:</p>
                <p>1. Please take a seat in the waiting lobby.</p>
                <p>2. We'll call your token number. Please take a seat in the waiting area.</p>
                <p>3. Proceed to the doctor's room when called.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    maClient.sendTokenNotification(issuedTicket.id, phoneNumber || '+91 98765 43210', 'sms');
                    showToast('Token details sent via SMS!');
                  }}
                  className="flex-1 py-3.5 rounded-full bg-slate-900 hover:bg-[#181e25] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[var(--touch,60px)]"
                >
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>Send SMS Pass</span>
                </button>
                <button
                  onClick={handleResetSession}
                  className="px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer shadow-xs min-h-[var(--touch,60px)]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MY VISIT TRACKER                                                      */}
        {/* ===================================================================== */}
        {screen === 'MY_VISIT' && (
          <div className="flex-1 flex flex-col justify-center items-center py-2 max-w-md mx-auto w-full">
            {issuedTicket ? (
              <div className="w-full bg-white rounded-3xl border-2 border-blue-200 p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider font-display">
                    Active Clinic Visit
                  </span>
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                    Token {issuedTicket.tokenLabel}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Station:</span>
                    <span className="font-bold text-slate-800">{issuedTicket.stationName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Queue Status:</span>
                    <span className="capitalize font-semibold text-emerald-700">{issuedTicket.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estimated Wait:</span>
                    <span className="font-mono font-bold text-blue-600">~{issuedTicket.estimatedWaitMin || 5} min</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm text-blue-950">
                  <p className="font-semibold">Directions:</p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {visitSummary?.room?.directions || `${issuedTicket.stationName}. Please take a seat in the waiting area.`}
                  </p>
                </div>

                <button
                  onClick={handleResetSession}
                  className="w-full py-3.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-[#181e25] cursor-pointer min-h-[var(--touch,60px)]"
                >
                  Close Visit Tracker
                </button>
              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 space-y-3">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 font-display">No Active Token Today</h3>
                <p className="text-sm text-slate-500">
                  Please touch Check-in if you have an appointment, or New Patient to register.
                </p>
                <button
                  onClick={() => handleNavClick('checkin')}
                  className="px-6 py-3 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 cursor-pointer min-h-[var(--touch,60px)]"
                >
                  Go to Check-in
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* DIRECTIONS: CATEGORIES LIST SCREEN                                    */}
        {/* ===================================================================== */}
        {screen === 'DIRECTIONS_CATEGORIES' && (
          <div className="flex-1 flex flex-col justify-between max-w-[680px] mx-auto w-full py-2 animate-in fade-in duration-200 min-h-0">
            <div className="space-y-3 overflow-y-auto pr-1 my-auto">
              {directionCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectDirectionCategory(cat)}
                  className="w-full p-4 sm:p-5 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-xl border-2 border-slate-200/90 hover:border-blue-400 hover:shadow-[0_12px_28px_rgba(20,86,240,0.12)] transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-[0.99] min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#1456f0] group-hover:to-[#2563eb] group-hover:text-white group-hover:scale-105 transition-all duration-200 shrink-0 shadow-xs">
                      <CategoryIcon icon={cat.icon} className="w-6 h-6" />
                    </div>
                    <div className="text-left space-y-0.5">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display group-hover:text-[#1456f0] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        {cat.rooms.length} {cat.rooms.length === 1 ? 'room / location' : 'rooms & locations'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#1456f0] transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">View Rooms</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-3 shrink-0">
              <button
                onClick={handleResetSession}
                className="w-full h-14 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-slate-200 text-slate-700 text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99]"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DIRECTIONS: ROOMS IN CATEGORY LIST SCREEN                             */}
        {/* ===================================================================== */}
        {screen === 'DIRECTIONS_ROOMS' && selectedDirectionCategory && (
          <div className="flex-1 flex flex-col justify-between max-w-[680px] mx-auto w-full py-2 animate-in fade-in duration-200 min-h-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                  <CategoryIcon icon={selectedDirectionCategory.icon} className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</span>
                  <h3 className="text-base font-bold text-slate-900 font-display leading-none">
                    {selectedDirectionCategory.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setScreen('DIRECTIONS_CATEGORIES')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 my-auto py-2">
              {selectedDirectionCategory.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleSelectDirectionRoom(room, 'browse')}
                  className="w-full p-4 sm:p-5 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-xl border-2 border-slate-200/90 hover:border-blue-400 hover:shadow-[0_12px_28px_rgba(20,86,240,0.12)] transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-[0.99] min-h-[64px]"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 font-display group-hover:text-[#1456f0] transition-colors">
                        {room.name}
                      </h4>
                      {room.floorWing && (
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{room.floorWing}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#1456f0] transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">Directions</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-3 shrink-0 flex items-center gap-3">
              <button
                onClick={() => setScreen('DIRECTIONS_CATEGORIES')}
                className="flex-1 h-14 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-slate-200 text-slate-700 text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99]"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
                <span>Back to Categories</span>
              </button>
              <button
                onClick={handleResetSession}
                className="px-6 h-14 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DIRECTIONS: ROOM DETAIL / RESULT SCREEN                               */}
        {/* ===================================================================== */}
        {screen === 'DIRECTIONS_RESULT' && selectedDirectionRoom && (
          <div className="flex-1 flex flex-col justify-between max-w-[680px] mx-auto w-full py-2 animate-in fade-in duration-200 min-h-0">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-blue-200 p-6 sm:p-8 shadow-xl space-y-6 my-auto">
              {/* Room Title Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Destination
                    </span>
                    {directionsEntrySource === 'voice_direct' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Direct Match
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                    {selectedDirectionRoom.name}
                  </h3>
                  {selectedDirectionRoom.floorWing && (
                    <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{selectedDirectionRoom.floorWing}</span>
                    </p>
                  )}
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Compass className="w-7 h-7 animate-pulse" />
                </div>
              </div>

              {/* Walking Instructions Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-slate-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-900 uppercase tracking-wider font-display">
                  <Navigation className="w-4 h-4 text-[#1456f0]" />
                  <span>Walking Instructions</span>
                </div>
                <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                  {selectedDirectionRoom.directions}
                </p>
              </div>

              {/* Wayfinding Tips */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Look for overhead departmental signage or ask any clinic floor assistant.</span>
              </div>
            </div>

            {/* Bottom Controls: Back + Done */}
            <div className="pt-3 shrink-0 flex items-center gap-3">
              <button
                onClick={handleDirectionsBack}
                className="flex-1 h-14 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-slate-200 text-slate-700 text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99]"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
                <span>
                  {directionsEntrySource === 'voice_direct' ? 'Back' : 'Back to Rooms'}
                </span>
              </button>
              <button
                onClick={handleResetSession}
                className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* GLOBAL FLOATING MIC ASSISTANT BUTTON                                  */}
        {/* ===================================================================== */}
        {screen !== 'IDLE' && isSpeechRecognitionSupported && (
          <div className="absolute bottom-5 right-5 z-40 pointer-events-auto">
            <button
              onClick={startGlobalDictation}
              title={
                isListeningGlobal
                  ? 'Listening... Speak a command or dictation'
                  : 'Tap to speak / voice control'
              }
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 group relative ${
                isListeningGlobal
                  ? 'bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white ring-4 ring-blue-400/40 shadow-blue-500/30 scale-105 animate-pulse'
                  : heardSuccessGlobal
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/40 shadow-emerald-500/30'
                  : 'bg-white/90 hover:bg-white text-slate-600 hover:text-[#1456f0] border-2 border-slate-200/90 hover:border-blue-300 shadow-[0_8px_20px_rgba(24,30,37,0.12)]'
              }`}
            >
              {isListeningGlobal ? (
                <div className="flex items-center gap-0.5">
                  <Mic className="w-5 h-5" />
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              ) : heardSuccessGlobal ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}

              {/* Floating Tooltip Pill */}
              <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50">
                {isListeningGlobal ? 'Listening... Speak command' : 'Voice Assistant'}
              </span>
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. FLOATING RIGHT CIRCULAR GLASS ACTIONS                                  */}
      {/* ========================================================================= */}
      <aside className="shrink-0 flex lg:flex-col items-center justify-center self-center z-30 gap-2.5 lg:-ml-8 py-2 overflow-x-auto lg:overflow-visible">
        {/* Main Navigation Group */}
        <div className="flex lg:flex-col items-center gap-2.5">
          {/* Home Button */}
          <button
            onClick={() => handleNavClick('home')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              screen === 'IDLE'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="Home"
          >
            <LayoutGrid className={`w-5 h-5 ${screen === 'IDLE' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Home
            </span>
          </button>

          {/* Check-in Button */}
          <button
            onClick={() => handleNavClick('checkin')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              flowType === 'SCHEDULED' && screen !== 'IDLE'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="Check-in"
          >
            <CalendarCheck className={`w-5 h-5 ${flowType === 'SCHEDULED' && screen !== 'IDLE' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Check-in
            </span>
          </button>

          {/* New Patient Button */}
          <button
            onClick={() => handleNavClick('new_patient')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              flowType === 'WALK_IN'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="New Patient"
          >
            <UserPlus className={`w-5 h-5 ${flowType === 'WALK_IN' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              New Patient
            </span>
          </button>

          {/* Pay Bill Button */}
          <button
            onClick={() => handleNavClick('payment')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              flowType === 'PAYMENT' && screen !== 'IDLE'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="Pay Bill"
          >
            <CreditCard className={`w-5 h-5 ${flowType === 'PAYMENT' && screen !== 'IDLE' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Pay Bill
            </span>
          </button>

          {/* Directions Button */}
          <button
            onClick={() => handleNavClick('directions')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              screen === 'DIRECTIONS_CATEGORIES' || screen === 'DIRECTIONS_ROOMS' || screen === 'DIRECTIONS_RESULT'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="Directions"
          >
            <Navigation className={`w-5 h-5 ${screen === 'DIRECTIONS_CATEGORIES' || screen === 'DIRECTIONS_ROOMS' || screen === 'DIRECTIONS_RESULT' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Directions
            </span>
          </button>

          {/* My Visit Button */}
          <button
            onClick={() => handleNavClick('my_visit')}
            className={`w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group ${
              screen === 'MY_VISIT'
                ? 'bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white shadow-[0_10px_25px_rgba(24,30,37,0.30)] ring-2 ring-blue-500/50 scale-105'
                : 'bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]'
            }`}
            title="My Visit"
          >
            <MapPin className={`w-5 h-5 ${screen === 'MY_VISIT' ? 'text-[#60a5fa]' : 'text-[#64748b] group-hover:text-blue-600'}`} />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              My Visit
            </span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={() => handleNavClick('lang')}
            className="w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_8px_20px_rgba(24,30,37,0.08)] hover:shadow-[0_12px_28px_rgba(20,86,240,0.18)] hover:scale-108 active:scale-95 text-[#45515e] hover:text-[#181e25]"
            title="Toggle Language"
          >
            <Globe className="w-4 h-4 text-[#2563eb]" />
            <span className="text-[10px] font-extrabold uppercase tracking-tight text-blue-700 leading-none mt-0.5">
              {currentLanguage === 'en' ? 'EN' : 'हिन्दी'}
            </span>
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Language: {currentLanguage === 'en' ? 'English' : 'Hindi'}
            </span>
          </button>
        </div>

        {/* Quick Actions & Utility Group */}
        <div className="flex lg:flex-col items-center gap-2.5 pt-1">
          {/* Audio Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_6px_16px_rgba(24,30,37,0.08)] hover:shadow-[0_10px_22px_rgba(20,86,240,0.15)] hover:scale-108 active:scale-95 transition-all text-[#45515e] hover:text-[#181e25] cursor-pointer relative group"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              {isMuted ? 'Unmute Audio' : 'Mute Audio'}
            </span>
          </button>

          {/* Start Over Button (Reset Station) */}
          <button
            onClick={() => handleResetSession()}
            className="w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-white/80 hover:bg-white backdrop-blur-xl shadow-[0_6px_16px_rgba(24,30,37,0.08)] hover:shadow-[0_10px_22px_rgba(20,86,240,0.15)] hover:scale-108 active:scale-95 transition-all text-[#45515e] hover:text-[#181e25] cursor-pointer relative group"
            title="Start over"
          >
            <RotateCcw className="w-4 h-4 text-slate-600 group-hover:rotate-180 transition-transform duration-500" />
            {inactivitySeconds !== null && inactivitySeconds > 0 && screen !== 'IDLE' && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white font-mono shadow-sm">
                {inactivitySeconds}s
              </span>
            )}
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Start over
            </span>
          </button>

          {/* Call Staff Button */}
          <button
            onClick={() => handleNavClick('staff')}
            className="w-12 h-12 lg:w-13 lg:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative group bg-red-50/90 hover:bg-red-500 hover:text-white backdrop-blur-xl shadow-[0_8px_20px_rgba(239,68,68,0.18)] hover:shadow-[0_12px_28px_rgba(239,68,68,0.35)] text-red-600 hover:scale-108 active:scale-95"
            title="Call Staff"
          >
            <HelpCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="absolute right-14 lg:right-[60px] px-2.5 py-1 bg-red-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50">
              Call Staff Assistance
            </span>
          </button>
        </div>
      </aside>

      {/* Staff Assistance Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181e25]/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display">
              Staff Assistance Summoned
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The front desk has been notified and someone is on the way.
            </p>
            <button
              onClick={() => setStaffModalOpen(false)}
              className="w-full py-3.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-[#181e25] cursor-pointer min-h-[var(--touch,60px)]"
            >
              Got it, thanks
            </button>
          </div>
        </div>
      )}

      {/* In-Panel Glass Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#181e25]/90 backdrop-blur-xl border border-white/20 text-white text-sm font-semibold shadow-[0_16px_40px_rgba(24,30,37,0.30)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AvatarReceptionView;
