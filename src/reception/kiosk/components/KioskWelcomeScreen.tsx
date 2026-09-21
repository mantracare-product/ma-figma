/**
 * KioskWelcomeScreen.tsx
 * Path: src/reception/kiosk/components/KioskWelcomeScreen.tsx
 *
 * Patient greeting and entry mode selector:
 * - Appointment Check-in
 * - Walk-in New Visit
 * - QR Scanner Pass
 * - AI Voice Assistant & Queries
 */

import React, { useEffect } from "react";
import {
  CalendarCheck,
  UserPlus,
  QrCode,
  Mic,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Building,
} from "lucide-react";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskWelcomeScreenProps {
  language: KioskLanguage;
  onSelectFlow: (flow: "checkin" | "walkin" | "qr" | "voice") => void;
  isVoiceMuted: boolean;
}

export const KioskWelcomeScreen: React.FC<KioskWelcomeScreenProps> = ({
  language,
  onSelectFlow,
  isVoiceMuted,
}) => {
  const t = TRANSLATIONS[language];

  // Optional friendly voice greeting on first mount
  useEffect(() => {
    if (!isVoiceMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(t.welcomeGreeting);
        utterance.rate = 1.0;
        utterance.lang = language === "hi" ? "hi-IN" : language === "es" ? "es-ES" : "en-US";
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        // Ignore audio policy blocks
      }
    }
  }, [language, isVoiceMuted, t.welcomeGreeting]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-6xl mx-auto w-full select-none font-['Outfit']">
      {/* Hero Welcome Header */}
      <div className="text-center space-y-3 mb-10 md:mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>Touch-Screen Reception</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          {t.welcomeGreeting}
        </h2>
        <p className="text-sm md:text-lg text-slate-400 max-w-xl mx-auto">
          {t.welcomeSubtitle}
        </p>
      </div>

      {/* Primary 4-Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 w-full max-w-4xl">
        {/* 1. Scheduled Check-in */}
        <button
          type="button"
          onClick={() => onSelectFlow("checkin")}
          className="group relative p-8 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-blue-500/80 rounded-3xl text-left transition-all duration-200 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1.5 mt-6">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {t.checkinOptionTitle}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              {t.checkinOptionDesc}
            </p>
          </div>
        </button>

        {/* 2. Walk-in New Visit */}
        <button
          type="button"
          onClick={() => onSelectFlow("walkin")}
          className="group relative p-8 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-emerald-500/80 rounded-3xl text-left transition-all duration-200 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-lg">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1.5 mt-6">
            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
              {t.walkinOptionTitle}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              {t.walkinOptionDesc}
            </p>
          </div>
        </button>

        {/* 3. Scan QR Pass */}
        <button
          type="button"
          onClick={() => onSelectFlow("qr")}
          className="group p-6 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-3xl text-left transition-all hover:bg-slate-850 active:scale-[0.98] cursor-pointer flex items-center gap-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all flex-shrink-0">
            <QrCode className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
              {t.qrOptionTitle}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {t.qrOptionDesc}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
        </button>

        {/* 4. Voice / AI Queries */}
        <button
          type="button"
          onClick={() => onSelectFlow("voice")}
          className="group p-6 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-3xl text-left transition-all hover:bg-slate-850 active:scale-[0.98] cursor-pointer flex items-center gap-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all flex-shrink-0">
            <Mic className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              {t.voiceOptionTitle}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {t.voiceOptionDesc}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};
