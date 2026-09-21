/**
 * KioskHeader.tsx
 * Path: src/reception/kiosk/components/KioskHeader.tsx
 *
 * Top navigation bar for the Patient Kiosk:
 * - Brand & Facility Title
 * - Live dynamic digital clock
 * - Multi-language switcher
 * - Emergency / Call Staff assistance button
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Globe,
  Bell,
  Volume2,
  VolumeX,
  Clock,
  HeartPulse,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskHeaderProps {
  language: KioskLanguage;
  onLanguageChange: (lang: KioskLanguage) => void;
  isVoiceMuted: boolean;
  onToggleVoiceMute: () => void;
  clinicName?: string;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  language,
  onLanguageChange,
  isVoiceMuted,
  onToggleVoiceMute,
  clinicName = "MantraCare Outpatient Clinic",
}) => {
  const [timeStr, setTimeStr] = useState("");
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCallStaff = () => {
    toast.success(t.staffHelpRequested, {
      duration: 5000,
      icon: <Bell className="w-5 h-5 text-amber-500 animate-bounce" />,
    });
  };

  return (
    <header className="h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-6 md:px-10 flex items-center justify-between select-none shadow-lg">
      {/* Clinic Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <HeartPulse className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white font-['Outfit']">
              {clinicName}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              AI Kiosk Online
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>Ground Floor Main Lobby</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-blue-400 font-mono font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeStr}
            </span>
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Language Picker */}
        <div className="flex items-center bg-slate-800/80 rounded-2xl p-1 border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => onLanguageChange("en")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "en"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange("hi")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "hi"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange("es")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "es"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Español
          </button>
        </div>

        {/* Audio Mute */}
        <button
          type="button"
          onClick={onToggleVoiceMute}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
            isVoiceMuted
              ? "bg-slate-800 text-slate-400 border-slate-700"
              : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
          }`}
          title={isVoiceMuted ? "Unmute Voice Prompts" : "Mute Voice Prompts"}
        >
          {isVoiceMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Call Staff Button */}
        <button
          type="button"
          onClick={handleCallStaff}
          className="px-4 h-11 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">{t.callStaff}</span>
        </button>
      </div>
    </header>
  );
};
