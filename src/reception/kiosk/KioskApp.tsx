/**
 * KioskApp.tsx
 * Path: src/reception/kiosk/KioskApp.tsx
 *
 * Main Patient Touch Kiosk Application Container:
 * - Device Provisioning & Heartbeat
 * - 30-Second Inactivity Auto-Reset
 * - Multi-Language Localization
 * - Interactive Patient Entry & Token Issuance Flow
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { KioskHeader } from "./components/KioskHeader";
import { KioskDeviceGuard } from "./components/KioskDeviceGuard";
import { KioskWelcomeScreen } from "./components/KioskWelcomeScreen";
import { KioskPhoneOtpScreen } from "./components/KioskPhoneOtpScreen";
import { KioskAppointmentMatchScreen } from "./components/KioskAppointmentMatchScreen";
import { KioskWalkInScreen } from "./components/KioskWalkInScreen";
import { KioskTokenIssuedScreen } from "./components/KioskTokenIssuedScreen";
import { KioskVoiceHelpModal } from "./components/KioskVoiceHelpModal";
import { KioskQrScannerModal } from "./components/KioskQrScannerModal";
import { getMaClient } from "../lib/api/maClient";
import type { PatientSummary, QueueTicket, Journey } from "../types/reception";
import type { KioskLanguage } from "./i18n";

type KioskScreenState =
  | "welcome"
  | "phone_otp"
  | "appointment_match"
  | "walkin"
  | "token_issued";

const IDLE_TIMEOUT_MS = 45000; // 45 seconds of inactivity resets kiosk

export default function KioskApp() {
  const maClient = getMaClient();

  // Device Auth state
  const [deviceToken, setDeviceToken] = useState<string | null>(() => {
    return localStorage.getItem("ma_kiosk_device_token");
  });
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    return localStorage.getItem("ma_kiosk_device_id");
  });

  // Settings
  const [language, setLanguage] = useState<KioskLanguage>("en");
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  // Active Flow State
  const [screen, setScreen] = useState<KioskScreenState>("welcome");
  const [flowType, setFlowType] = useState<"checkin" | "walkin">("checkin");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [issuedTicket, setIssuedTicket] = useState<QueueTicket | null>(null);
  const [issuedJourney, setIssuedJourney] = useState<Journey | null>(null);

  // Modals
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Heartbeat loop
  useEffect(() => {
    if (!deviceId) return;
    const sendHeartbeat = () => {
      maClient.deviceHeartbeat(deviceId, "online").catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [deviceId, maClient]);

  // Idle timer auto-reset
  const idleTimerRef = useRef<any>(null);

  const resetToWelcome = useCallback(() => {
    setScreen("welcome");
    setSelectedPatient(null);
    setSessionToken("");
    setIssuedTicket(null);
    setIssuedJourney(null);
    setShowVoiceModal(false);
    setShowQrModal(false);
  }, []);

  const handleUserActivity = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (screen !== "welcome") {
      idleTimerRef.current = setTimeout(() => {
        resetToWelcome();
      }, IDLE_TIMEOUT_MS);
    }
  }, [screen, resetToWelcome]);

  useEffect(() => {
    window.addEventListener("pointerdown", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    handleUserActivity();

    return () => {
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleUserActivity]);

  // Device Pairing Handler
  const handleAuthenticated = (devId: string, token: string) => {
    setDeviceId(devId);
    setDeviceToken(token);
  };

  // Welcome Screen selection
  const handleSelectFlow = (flow: "checkin" | "walkin" | "qr" | "voice") => {
    if (flow === "qr") {
      setShowQrModal(true);
    } else if (flow === "voice") {
      setShowVoiceModal(true);
    } else {
      setFlowType(flow);
      setScreen("phone_otp");
    }
  };

  // Patient Authenticated via Phone + OTP
  const handlePatientSelected = (patient: PatientSummary, sessToken: string) => {
    setSelectedPatient(patient);
    setSessionToken(sessToken);
    if (flowType === "checkin") {
      setScreen("appointment_match");
    } else {
      setScreen("walkin");
    }
  };

  // Token Issuance Complete
  const handleCheckinSuccess = (ticket: QueueTicket, journey: Journey) => {
    setIssuedTicket(ticket);
    setIssuedJourney(journey);
    setScreen("token_issued");
  };

  // If unprovisioned, show Device Guard
  if (!deviceToken || !deviceId) {
    return <KioskDeviceGuard onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 overflow-x-hidden font-['Outfit'] select-none">
      {/* Top Bar */}
      <KioskHeader
        language={language}
        onLanguageChange={setLanguage}
        isVoiceMuted={isVoiceMuted}
        onToggleVoiceMute={() => setIsVoiceMuted(!isVoiceMuted)}
      />

      {/* Main Interactive View Area */}
      <main className="flex-1 flex items-center justify-center p-4">
        {screen === "welcome" && (
          <KioskWelcomeScreen
            language={language}
            onSelectFlow={handleSelectFlow}
            isVoiceMuted={isVoiceMuted}
          />
        )}

        {screen === "phone_otp" && (
          <KioskPhoneOtpScreen
            language={language}
            flow={flowType}
            onBack={() => setScreen("welcome")}
            onPatientSelected={handlePatientSelected}
          />
        )}

        {screen === "appointment_match" && selectedPatient && (
          <KioskAppointmentMatchScreen
            language={language}
            patient={selectedPatient}
            sessionToken={sessionToken}
            onBack={() => setScreen("phone_otp")}
            onCheckinSuccess={handleCheckinSuccess}
            onSwitchToWalkin={() => {
              setFlowType("walkin");
              setScreen("walkin");
            }}
          />
        )}

        {screen === "walkin" && selectedPatient && (
          <KioskWalkInScreen
            language={language}
            patient={selectedPatient}
            sessionToken={sessionToken}
            onBack={() => setScreen("phone_otp")}
            onCheckinSuccess={handleCheckinSuccess}
          />
        )}

        {screen === "token_issued" && issuedTicket && issuedJourney && (
          <KioskTokenIssuedScreen
            language={language}
            ticket={issuedTicket}
            journey={issuedJourney}
            onResetToWelcome={resetToWelcome}
            isVoiceMuted={isVoiceMuted}
          />
        )}
      </main>

      {/* Footer Branding Bar */}
      <footer className="h-12 bg-slate-900/60 border-t border-slate-800/80 px-6 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>MantraAssist Kiosk v1.0 • Touch Enabled</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Privacy Gated Terminal</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("ma_kiosk_device_token");
              localStorage.removeItem("ma_kiosk_device_id");
              setDeviceToken(null);
              setDeviceId(null);
            }}
            className="hover:text-slate-400 underline cursor-pointer"
          >
            Admin Unpair
          </button>
        </div>
      </footer>

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <KioskVoiceHelpModal
          language={language}
          onClose={() => setShowVoiceModal(false)}
          onSelectFlow={(f) => {
            setShowVoiceModal(false);
            setFlowType(f);
            setScreen("phone_otp");
          }}
          isVoiceMuted={isVoiceMuted}
        />
      )}

      {/* QR Scanner Modal */}
      {showQrModal && (
        <KioskQrScannerModal
          onClose={() => setShowQrModal(false)}
          onCheckinSuccess={handleCheckinSuccess}
        />
      )}
    </div>
  );
}
