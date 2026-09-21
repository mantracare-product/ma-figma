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
} from 'lucide-react';
import { AnimatedAvatar, type AvatarState } from './components/AnimatedAvatar';
import { getMaClient } from '../lib/api/maClient';
import type {
  PatientSummary,
  QueueTicket,
  ServiceItem,
  ProviderItem,
  VisitSummary,
} from '../types/reception';
import '../styles/navodyaTokens.css';
import '../styles/avatarStage.css';

export type ScreenState =
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
  | 'MY_VISIT';

export type FaceScanPhase = 'idle' | 'starting' | 'scanning' | 'success' | 'no_match' | 'denied';
export type FaceRegistrationPhase = 'intro' | 'capturing' | 'duplicate_found' | 'success' | 'denied';

export type FlowType = 'SCHEDULED' | 'WALK_IN' | 'MY_VISIT' | null;

const INACTIVITY_TIMEOUT_SECONDS = 60;

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

  // Navigation & Flow State (Landing screen is default on load/reset)
  const [screen, setScreen] = useState<ScreenState>('IDLE');
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi'>('en');

  // Avatar & Voice State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [thinkingMessage, setThinkingMessage] = useState<string>('Ready to scan...');
  const [captionText, setCaptionText] = useState<string>(
    'Welcome to MantraCare Health Center. Please touch an option to begin.'
  );
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

  // Expose test hook for face position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setFacePosition = (pos: 'aligned' | 'too_close' | 'too_far' | 'off_center' | 'idle') => {
        setFacePosition(pos);
      };
    }
  }, []);

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
    maClient.getProviders().then(setProviders).catch(console.error);
  }, []);

  // Voice synthesis & live captioning
  const speak = useCallback(
    (text: string, state: AvatarState = 'speaking', thinkMsg?: string) => {
      setCaptionText(text);
      if (thinkMsg) setThinkingMessage(thinkMsg);
      setAvatarState(state);

      if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
        if (state === 'speaking') {
          setTimeout(() => setAvatarState('idle'), 2600);
        }
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';

        utterance.onstart = () => setAvatarState('speaking');
        utterance.onend = () => {
          if (state !== 'success' && state !== 'thinking') {
            setAvatarState('idle');
          }
        };
        utterance.onerror = () => {
          if (state !== 'success' && state !== 'thinking') {
            setAvatarState('idle');
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setAvatarState('idle');
      }
    },
    [isMuted, currentLanguage]
  );

  // Clear all scan timers
  const clearAllScanTimers = useCallback(() => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (hintTimer1Ref.current) clearTimeout(hintTimer1Ref.current);
    if (hintTimer2Ref.current) clearTimeout(hintTimer2Ref.current);
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    if (regStepTimerRef.current) clearTimeout(regStepTimerRef.current);
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
  }, [clearAllScanTimers]);

  // Start active camera preview (live video selfie style)
  const startCameraPreview = useCallback(async () => {
    if (streamRef.current && streamRef.current.active) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        throw new Error('Camera device or getUserMedia not available');
      }
    } catch (e) {
      console.warn('Camera preview unavailable:', e);
      stopCameraStream();
      if (screen === 'ONBOARDING_FACE') {
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
  }, [stopCameraStream, speak, currentLanguage, screen]);

  // Hook to start/stop live camera preview based on active screen (Never open on IDLE / Landing / Intro)
  useEffect(() => {
    const isFaceScreen =
      screen === 'FACE_SCAN' ||
      screen === 'FACE_CONSENT' ||
      (screen === 'ONBOARDING_FACE' && faceRegPhase === 'capturing');

    if (isFaceScreen) {
      startCameraPreview();
    } else {
      stopCameraStream();
    }
  }, [screen, faceRegPhase, startCameraPreview, stopCameraStream]);

  // Ensure video element receives active stream upon rendering
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [screen, facePhase]);

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

  // Reset Session (Always returns to IDLE Landing screen)
  const handleResetSession = useCallback((param?: boolean | React.MouseEvent) => {
    const skipSpeechIfIdle = typeof param === 'boolean' ? param : false;
    clearAllScanTimers();
    stopCameraStream();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const wasIdle = screenRef.current === 'IDLE';

    setScreen('IDLE');
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
    setOnboardingForm({
      name: '',
      dob: '',
      age: 34,
      gender: 'Female',
      email: '',
      reason: 'General Consultation',
      faceCheckinNextTime: false,
    });

    if (!(skipSpeechIfIdle && wasIdle)) {
      speak(
        currentLanguage === 'hi'
          ? 'मंत्राकेयर में आपका स्वागत है। शुरू करने के लिए कृपया एक विकल्प चुनें।'
          : 'Welcome to MantraCare Health Center. Please touch an option to begin.',
        'idle'
      );
    }
  }, [stopCameraStream, speak, currentLanguage, clearAllScanTimers]);

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
        if (screenRef.current !== 'IDLE') {
          handleResetSession(true);
        }
        lastActivityTimeRef.current = Date.now();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [handleResetSession]);

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
  const handleNavClick = (target: 'home' | 'checkin' | 'new_patient' | 'my_visit' | 'lang' | 'staff') => {
    handleUserActivity();
    if (target === 'home') {
      handleResetSession();
    } else if (target === 'checkin') {
      stopCameraStream();
      setFlowType('SCHEDULED');
      setScreen('FACE_SCAN');
      speak('Please look into the camera to check in, or use your phone number below.');
    } else if (target === 'new_patient') {
      stopCameraStream();
      setFlowType('WALK_IN');
      setScreen('PHONE');
      speak('Welcome! Please enter your mobile phone number on the touch keypad to begin registration.');
    } else if (target === 'my_visit') {
      stopCameraStream();
      setFlowType('MY_VISIT');
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

      if (flowType === 'SCHEDULED') {
        if (!found || found.length === 0) {
          setErrorMessage('No appointment found for this phone number. Please register as new patient.');
          speak('We could not find an appointment with this number. You can register as a new patient.', 'apologetic');
          setScreen('PHONE');
          return;
        }

        if (found.length === 1) {
          const pat = found[0];
          setSelectedPatient(pat);
          const summary = await maClient.getVisitSummary(pat.id);
          setVisitSummary(summary);
          setScreen('DETAILS_SUMMARY');
          speak(`Welcome ${pat.name}. Here are your appointment details. Please confirm check-in.`);
        } else {
          setPatients(found);
          setScreen('PATIENT_PICK');
          speak('Multiple patients are registered under this number. Who is checking in today?');
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
    speak(`Welcome ${pat.name}. Please confirm your appointment details.`);
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
                  {avatarState === 'thinking' ? thinkingMessage : 'Aria Speaking'}
                </p>
                {/* CSS Animated Voice Waveform Bars (Active only while speaking) */}
                {avatarState === 'speaking' && (
                  <div className="flex items-center gap-1 h-3.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={i}
                        className="wave-bar"
                        style={{ '--i': i } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm lg:text-base font-medium text-white leading-snug">
                {captionText}
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
              {/* Back to Home Ghost Button */}
              {(screen === 'FACE_SCAN' || screen === 'PHONE' || screen === 'PATIENT_PICK') && (
                <button
                  onClick={() => {
                    handleResetSession();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer w-fit mb-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              )}
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
        {/* LANDING SCREEN (Home: 2 Large Glass Quick Buttons)                     */}
        {/* ===================================================================== */}
        {screen === 'IDLE' && (
          <div className="flex-1 w-full h-full flex flex-col justify-between py-2 min-h-0 animate-in fade-in duration-300">
            {/* Welcome Header */}
            <div className="text-center sm:text-left pt-2 pb-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#181e25] tracking-tight font-display">
                Welcome to MantraCare
              </h2>
              <p className="text-base sm:text-lg text-[#475569] mt-1.5 font-medium">
                Fast, contactless check-in and clinic walk-in registration.
              </p>
            </div>

            {/* Two Large Clinical Glass Quick Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 my-auto py-2">
              {/* 1. I Have an Appointment */}
              <button
                onClick={() => {
                  handleUserActivity();
                  setFlowType('SCHEDULED');
                  setScreen('FACE_SCAN');
                  speak('Please look into the camera to check in, or use your phone number below.');
                }}
                className="group text-left p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-8 -mt-8" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <CalendarCheck className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold tracking-wide uppercase border border-blue-200/60">
                      Scheduled
                    </span>
                  </div>

                  <h3 className="text-xl lg:text-2xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    I Have an Appointment
                  </h3>
                  <p className="text-sm sm:text-base text-[#64748b] mt-2 leading-relaxed">
                    Instant face recognition or phone lookup for pre-booked visits & consultations.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 text-sm sm:text-base font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Touch to Check In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* 2. I'm a Walk-in Patient (Electric Blue Glass Treatment) */}
              <button
                onClick={() => {
                  handleUserActivity();
                  setFlowType('WALK_IN');
                  setScreen('PHONE');
                  speak('Welcome! Please enter your mobile phone number on the touch keypad to begin registration.');
                }}
                className="group text-left p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-white/90 via-white/75 to-blue-50/60 hover:from-white hover:to-blue-50/90 backdrop-blur-xl border-2 border-blue-200 hover:border-[#1456f0] shadow-[0_12px_32px_rgba(20,86,240,0.12)] hover:shadow-[0_18px_44px_rgba(20,86,240,0.22)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[var(--touch,60px)]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 -mr-8 -mt-8" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1456f0] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold tracking-wide uppercase border border-blue-200/60">
                      Walk-in / New
                    </span>
                  </div>

                  <h3 className="text-xl lg:text-2xl font-bold text-[#181e25] font-display group-hover:text-[#1456f0] transition-colors">
                    I'm a Walk-in Patient
                  </h3>
                  <p className="text-sm sm:text-base text-[#64748b] mt-2 leading-relaxed">
                    Register without an appointment, pick your doctor or service, and get an immediate token.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 text-sm sm:text-base font-bold text-[#1456f0] group-hover:translate-x-1 transition-transform">
                  <span>Start Registration</span>
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
        {/* THREE-CARD VISIT DETAILS SUMMARY                                      */}
        {/* ===================================================================== */}
        {screen === 'DETAILS_SUMMARY' && visitSummary && (
          <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Patient Details */}
              <div className="bg-white/90 rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display block mb-1">
                    Patient Details
                  </span>
                  <h3 className="text-base font-bold text-[#222222] font-display">
                    {visitSummary.patient.name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {visitSummary.patient.age} yrs • {visitSummary.patient.gender}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Patient ID:</span>
                    <span className="font-mono font-semibold text-slate-700">{visitSummary.patient.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono text-slate-700">{visitSummary.patient.maskedPhone}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Appointment Details */}
              <div className="bg-white/90 rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-display block mb-1">
                    Scheduled Appointment
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {visitSummary.appointment.serviceName}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {visitSummary.appointment.providerName}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Date & Time:</span>
                    <span className="font-semibold text-slate-800 font-display">
                      {visitSummary.appointment.date} @ {visitSummary.appointment.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Room & Directions */}
              <div className="bg-gradient-to-br from-blue-50/60 to-blue-100/40 rounded-2xl border-2 border-blue-200 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 font-display block mb-1">
                    Station & Room Assignment
                  </span>
                  <h3 className="text-lg font-bold text-blue-950 font-display">
                    {visitSummary.room.roomName}
                  </h3>
                  <p className="text-sm text-blue-800 font-medium mt-0.5">
                    {visitSummary.room.floorWing}
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-200/60 mt-2 space-y-1 text-xs">
                  <p className="text-xs text-slate-700 leading-tight">
                    📍 {visitSummary.room.directions}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-500">Est. Wait Time:</span>
                    <span className="font-bold text-blue-700 font-mono">~{visitSummary.room.estimatedWaitMin} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleConfirmCheckin}
                className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[var(--touch,60px)]"
              >
                <Check className="w-5 h-5" />
                <span>Confirm check-in & Print Token</span>
              </button>
              <button
                onClick={handleResetSession}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors cursor-pointer min-h-[var(--touch,60px)]"
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
          <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                value={onboardingForm.name}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                placeholder="e.g. Sunita Rao"
                className="w-full px-4 rounded-xl border border-slate-200 bg-white text-xl focus:border-[#1456f0] outline-none h-[var(--touch,60px)] min-h-[56px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Age / Date of Birth</label>
                <input
                  type="number"
                  value={onboardingForm.age}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, age: Number(e.target.value) })}
                  className="w-full px-4 rounded-xl border border-slate-200 bg-white text-xl focus:border-[#1456f0] outline-none font-mono h-[var(--touch,60px)] min-h-[56px]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={onboardingForm.gender}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, gender: e.target.value })}
                  className="w-full px-4 rounded-xl border border-slate-200 bg-white text-xl focus:border-[#1456f0] outline-none cursor-pointer h-[var(--touch,60px)] min-h-[56px]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={onboardingForm.email}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-4 rounded-xl border border-slate-200 bg-white text-xl focus:border-[#1456f0] outline-none h-[var(--touch,60px)] min-h-[56px]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Visit</label>
              <input
                type="text"
                value={onboardingForm.reason}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, reason: e.target.value })}
                placeholder="e.g. General checkup, Fever"
                className="w-full px-4 rounded-xl border border-slate-200 bg-white text-xl focus:border-[#1456f0] outline-none h-[var(--touch,60px)] min-h-[56px]"
              />
            </div>

            <button
              onClick={handleOnboardingStep1Next}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
            >
              <span>{onboardingForm.age < 18 ? 'Next: Review Registration' : 'Next: Face Registration'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ONBOARDING - STEP 2 FACE REGISTRATION                                 */}
        {/* ===================================================================== */}
        {screen === 'ONBOARDING_FACE' && (
          <div className="flex-1 w-full h-full flex flex-col justify-between relative py-1 min-h-0">
            {/* SUB-STATE 1: INTRO STATE (Before camera starts) */}
            {faceRegPhase === 'intro' && (
              <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-4 space-y-6 animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 text-[#1456f0] border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
                    <ScanFace className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 font-display">
                    Faster Check-in at Future Visits
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Enable autonomous patient identification so you can check in with just a glance next time.
                  </p>
                </div>

                {/* Informed Consent Box */}
                <div className="p-5 bg-white/90 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm font-display">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Biometric Privacy & Consent</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    We save a secure face template with your patient record so we can recognize you at future visits. We do not save photos. You can ask staff to delete it at any time.
                  </p>
                </div>

                {/* Equal-sized action buttons: Register (Primary) & Skip (Glass) */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleStartFaceRegistration}
                    className="py-3.5 px-4 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] hover:from-[#1146c7] hover:to-[#1d4ed8] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[var(--touch,60px)]"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Register my face</span>
                  </button>
                  <button
                    onClick={handleSkipFaceRegistration}
                    className="py-3.5 px-4 rounded-full bg-white/80 hover:bg-white border border-slate-200 text-slate-700 text-base font-semibold backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
                  >
                    <span>Skip for now</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STATE 2: LIVE 3-SAMPLE CAPTURE STATE */}
            {faceRegPhase === 'capturing' && (
              <div className="flex-1 w-full h-full flex flex-col justify-between relative min-h-0">
                <div className="flex-1 min-h-0 w-full relative rounded-[28px] overflow-hidden bg-[#181e25] border-2 border-white/80 shadow-[0_16px_40px_rgba(24,30,37,0.18)] flex flex-col justify-between">
                  {/* Live Mirrored Selfie Camera */}
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

                  {/* Top Center Live Hint Pill */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="py-1.5 px-4 rounded-full text-center border backdrop-blur-xl shadow-lg flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 bg-slate-900/85 border-white/20 text-white">
                      <Eye className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse shrink-0" />
                      <span>{regHint}</span>
                    </div>
                  </div>

                  {/* Viewfinder with 3-Dot Progress and Centered Oval Guide */}
                  <div className="absolute inset-x-0 top-14 bottom-24 grid place-items-center pointer-events-none z-10">
                    <div
                      className="relative flex flex-col items-center justify-center transition-all duration-300 pointer-events-none"
                      style={{
                        height: 'min(100%, 560px)',
                        aspectRatio: '3 / 4',
                        maxWidth: '70%',
                      }}
                    >
                      {/* 3-Dot Progress Indicators */}
                      <div className="flex items-center gap-3 mb-2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15">
                        {[
                          { idx: 0, label: 'Front' },
                          { idx: 1, label: 'Left' },
                          { idx: 2, label: 'Right' },
                        ].map((s) => (
                          <div key={s.idx} className="flex items-center gap-1.5">
                            <div
                              className={`w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center ${
                                regSampleIndex > s.idx
                                  ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                                  : regSampleIndex === s.idx
                                  ? 'bg-[#1456f0] ring-2 ring-blue-400 animate-pulse'
                                  : 'bg-white/30'
                              }`}
                            >
                              {regSampleIndex > s.idx && <Check className="w-2 h-2 text-slate-900 stroke-[3]" />}
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                regSampleIndex === s.idx
                                  ? 'text-white font-bold'
                                  : regSampleIndex > s.idx
                                  ? 'text-emerald-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Dashed Oval Container with 4 Corner Brackets */}
                      <div className="relative flex-1 w-full flex items-center justify-center">
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-xl border-[#3b82f6]" />
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-xl border-[#3b82f6]" />
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-xl border-[#3b82f6]" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-xl border-[#3b82f6]" />

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

                  {/* Bottom Action Area */}
                  <div className="w-full h-24 shrink-0 flex items-center justify-center gap-3 px-4 pb-4 z-20 pointer-events-auto">
                    <button
                      onClick={handleSkipFaceRegistration}
                      className="h-12 px-6 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-md text-sm font-semibold shadow-lg transition-all cursor-pointer flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel & Skip</span>
                    </button>
                    {regAttempts >= 3 && (
                      <button
                        onClick={handleSkipFaceRegistration}
                        className="h-12 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold backdrop-blur-md shadow-lg transition-all cursor-pointer"
                      >
                        Skip registration
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STATE 3: DUPLICATE PROMPT STATE */}
            {faceRegPhase === 'duplicate_found' && duplicateCandidate && (
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-3xl border-2 border-blue-300 p-6 shadow-xl space-y-4">
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
                      className="w-full sm:flex-1 py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
                    >
                      <Check className="w-4 h-4" />
                      <span>Yes, that's me</span>
                    </button>
                    <button
                      onClick={handleDuplicateConfirmNo}
                      className="w-full sm:flex-1 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors cursor-pointer min-h-[var(--touch,60px)]"
                    >
                      No, continue as new
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STATE 4: SUCCESS STATE */}
            {faceRegPhase === 'success' && (
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-3xl border-2 border-emerald-300 p-7 shadow-xl space-y-5">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Face registered
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 font-display pt-2">
                      Ready for Faster Check-in
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                      Your face template is prepared and will be saved with your patient registration upon approval.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleContinueToReview}
                      className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[var(--touch,60px)]"
                    >
                      <span>Continue to Review</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STATE 5: CAMERA DENIED / UNAVAILABLE */}
            {faceRegPhase === 'denied' && (
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-4 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-md space-y-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 font-display">Camera Unavailable</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Camera access was not granted or is unavailable. You can proceed with registration without face check-in.
                    </p>
                  </div>
                  <button
                    onClick={handleSkipFaceRegistration}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
                  >
                    <span>Continue to Review</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* ONBOARDING - STEP 3 HUMAN-CONFIRMATION GATE                           */}
        {/* ===================================================================== */}
        {screen === 'ONBOARDING_REVIEW' && (
          <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 space-y-3">
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                  Patient Registration Summary
                </span>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  MantraAssist Intake
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Full Name:</span>
                  <span className="font-bold text-slate-900">{onboardingForm.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Phone:</span>
                  <span className="font-mono text-slate-800">{phoneNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Age & Gender:</span>
                  <span className="text-slate-800">{onboardingForm.age} yrs • {onboardingForm.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Face Check-in:</span>
                  <span className={`font-semibold ${onboardingForm.faceCheckinNextTime ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {onboardingForm.faceCheckinNextTime ? 'Enrolled ✓ (Consent on file)' : (onboardingForm.age < 18 ? 'Not available (under 18)' : 'Skipped / Disabled')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-sm">
                <span className="text-slate-400 block text-xs">Assigned Default Process:</span>
                <span className="font-semibold text-slate-800">Appointment Booking & Queue Journey</span>
              </div>
            </div>

            {/* Human-Confirmation Gate: Approve / Edit / Decline Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleOnboardingApprove}
                className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
              >
                <Check className="w-5 h-5" />
                <span>Approve Registration</span>
              </button>

              <button
                onClick={() => setScreen('ONBOARDING_DETAILS')}
                className="px-5 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 min-h-[var(--touch,60px)]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>

              <button
                onClick={handleResetSession}
                className="px-5 py-3.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-semibold text-red-700 transition-colors cursor-pointer flex items-center gap-1.5 min-h-[var(--touch,60px)]"
              >
                <X className="w-4 h-4" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SERVICE & DOCTOR SELECTION                                            */}
        {/* ===================================================================== */}
        {screen === 'SERVICE_DOCTOR' && (
          <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Choose Service</label>
              <div className="space-y-2">
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer min-h-[var(--touch,60px)] ${
                      selectedServiceId === srv.id
                        ? 'border-[#1456f0] bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">{srv.name}</h4>
                      <p className="text-xs text-slate-500">Duration: {srv.durationMin} min • Base: ₹{srv.basePrice || 500}</p>
                    </div>
                    {selectedServiceId === srv.id && <CheckCircle className="w-5 h-5 text-[#1456f0]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Provider Assignment</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedProviderId('next_available')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer min-h-[var(--touch,60px)] flex flex-col justify-center ${
                    selectedProviderId === 'next_available'
                      ? 'border-[#1456f0] bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <h4 className="text-sm font-bold text-slate-900 font-display">⚡ Next Available</h4>
                  <p className="text-xs text-slate-500">Shortest estimated queue</p>
                </button>

                {providers.slice(0, 3).map((prov) => (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedProviderId(prov.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer min-h-[var(--touch,60px)] flex flex-col justify-center ${
                      selectedProviderId === prov.id
                        ? 'border-[#1456f0] bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <h4 className="text-sm font-bold text-slate-900 font-display">{prov.name}</h4>
                    <p className="text-xs text-slate-500">{prov.specialization || prov.specialty || 'General Physician'}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleBookWalkIn}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#1456f0] to-[#2563eb] text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[var(--touch,60px)]"
            >
              <span>Confirm & Issue Queue Ticket</span>
              <ArrowRight className="w-5 h-5" />
            </button>
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
