/**
 * KioskTokenIssuedScreen.tsx
 * Path: src/reception/kiosk/components/KioskTokenIssuedScreen.tsx
 *
 * Visual token slip card issued upon check-in:
 * - High-contrast token badge (e.g. D-042)
 * - Room / Station routing
 * - Live estimated wait time
 * - WhatsApp & SMS notification triggers
 * - Auto-reset countdown progress bar
 */

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Sparkles,
  Smartphone,
  RotateCcw,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { QueueTicket, Journey } from "../../types/reception";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskTokenIssuedScreenProps {
  language: KioskLanguage;
  ticket: QueueTicket;
  journey: Journey;
  onResetToWelcome: () => void;
  isVoiceMuted: boolean;
}

export const KioskTokenIssuedScreen: React.FC<KioskTokenIssuedScreenProps> = ({
  language,
  ticket,
  journey,
  onResetToWelcome,
  isVoiceMuted,
}) => {
  const t = TRANSLATIONS[language];
  const maClient = getMaClient();

  const [countdown, setCountdown] = useState(15);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  // Trigger celebration confetti & voice announcement on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#10b981", "#6366f1", "#f59e0b"],
      });
    } catch {
      // Ignore confetti fallback
    }

    if (!isVoiceMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const speechText =
          language === "hi"
            ? `आपका टोकन नंबर ${ticket.tokenLabel || ticket.ticketNumber} है। कृपया प्रतीक्षा कक्ष में बैठें।`
            : `Your token number is ${ticket.tokenLabel || ticket.ticketNumber}. Please take a seat in the waiting lounge.`;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = language === "hi" ? "hi-IN" : "en-US";
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore audio policy
      }
    }
  }, [ticket, language, isVoiceMuted]);

  // 15-second auto-reset timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onResetToWelcome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onResetToWelcome]);

  const handleSendNotification = async (channel: "sms" | "whatsapp") => {
    const phone = ticket.clientPhone || journey.clientPhone || "+1 (555) 234-5678";
    try {
      await maClient.sendTokenNotification(ticket.id, phone, channel);
      if (channel === "whatsapp") {
        setWhatsappSent(true);
        toast.success(`WhatsApp token pass sent to ${phone}`);
      } else {
        setSmsSent(true);
        toast.success(`SMS token link sent to ${phone}`);
      }
    } catch {
      toast.error("Failed to send notification.");
    }
  };

  const tokenNumber = ticket.tokenLabel || ticket.ticketNumber || "A-001";
  const stationName = ticket.stationName || "Clinical Consultation Room";
  const waitMin = ticket.estimatedWaitMin || 10;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full select-none font-['Outfit']">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Success Header */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {t.tokenSuccessTitle}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto">
            {t.tokenSuccessSubtitle}
          </p>
        </div>

        {/* Token Slip Card */}
        <div className="relative p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-blue-500/40 rounded-3xl shadow-2xl space-y-5 overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
              {t.yourTokenNumber}
            </span>
            <div className="text-5xl md:text-6xl font-black font-mono tracking-tight text-white py-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400">
              {tokenNumber}
            </div>
            <p className="text-xs text-slate-400">
              Patient: <span className="font-bold text-white">{ticket.clientName || ticket.patientName || "Patient"}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-left">
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                {t.assignedStation}
              </span>
              <p className="text-sm font-bold text-white truncate mt-0.5">
                {stationName}
              </p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                {t.estimatedWait}
              </span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                ~{waitMin} {t.minutes}
              </p>
            </div>
          </div>
        </div>

        {/* Live Phone Notification Buttons */}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-slate-400">{t.sendNotificationTo}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSendNotification("whatsapp")}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                whatsappSent
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                  : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              {whatsappSent ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 text-emerald-400" />}
              {whatsappSent ? t.whatsappSent : "WhatsApp Token"}
            </button>

            <button
              type="button"
              onClick={() => handleSendNotification("sms")}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                smsSent
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              {smsSent ? <Check className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-blue-400" />}
              {smsSent ? t.smsSent : "SMS Alert"}
            </button>
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onResetToWelcome}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          {t.doneBtn}
        </button>

        {/* Auto Reset Progress Bar */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>{t.autoResetNotice}</span>
            <span className="font-bold text-slate-400">{countdown}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 15) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
