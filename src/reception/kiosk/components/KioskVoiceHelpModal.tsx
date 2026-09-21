/**
 * KioskVoiceHelpModal.tsx
 * Path: src/reception/kiosk/components/KioskVoiceHelpModal.tsx
 *
 * Patient interactive voice assistant modal:
 * - Uses Web Speech API (SpeechRecognition + SpeechSynthesis)
 * - Queries clinic Knowledge Base (hours, parking, pharmacy, check-in intents)
 * - Text fallback for devices without mic hardware
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  Send,
  HelpCircle,
  Bell,
  MapPin,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskVoiceHelpModalProps {
  language: KioskLanguage;
  onClose: () => void;
  onSelectFlow?: (flow: "checkin" | "walkin") => void;
  isVoiceMuted: boolean;
}

export const KioskVoiceHelpModal: React.FC<KioskVoiceHelpModalProps> = ({
  language,
  onClose,
  onSelectFlow,
  isVoiceMuted,
}) => {
  const t = TRANSLATIONS[language];
  const maClient = getMaClient();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedQuery, setTypedQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language === "hi" ? "hi-IN" : language === "es" ? "es-ES" : "en-US";

        recognition.onresult = (event: any) => {
          const text = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setTranscript(text);
          if (event.results[0].isFinal) {
            handleProcessQuery(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.info("Microphone recognition is active via Web Speech API or type below.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setAnswer(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleProcessQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAnswering(true);
    try {
      // 1. Check Voice Intent first (e.g. check-in intent)
      const intentRes = await maClient.processVoiceIntent(queryText);
      if (intentRes.intent === "check_in" && onSelectFlow) {
        onClose();
        onSelectFlow("checkin");
        return;
      }
      if (intentRes.intent === "walk_in" && onSelectFlow) {
        onClose();
        onSelectFlow("walkin");
        return;
      }

      // 2. Query simulated Knowledge Base
      const kbResults = await maClient.queryKnowledgeBase(queryText);
      const chosenAnswer =
        kbResults.length > 0
          ? kbResults[0].answer
          : "Our OPD clinic is open Monday to Saturday from 8:00 AM to 8:00 PM.";
      setAnswer(chosenAnswer);

      // Speak answer if not muted
      if (!isVoiceMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(chosenAnswer);
        utterance.lang = language === "hi" ? "hi-IN" : "en-US";
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setAnswer("Let me connect you with our front-desk nurse to help you with this inquiry.");
    } finally {
      setIsAnswering(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setTranscript(q);
    handleProcessQuery(q);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none font-['Outfit'] animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t.voiceOptionTitle}</h3>
              <p className="text-xs text-slate-400">Powered by Web Speech & Clinic Knowledge Base</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Mic Button & Listening Pulse */}
        <div className="text-center py-4 space-y-4">
          <div className="relative inline-block">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
            )}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all shadow-2xl active:scale-95 cursor-pointer relative z-10 ${
                isListening
                  ? "bg-amber-500 shadow-amber-500/40 ring-4 ring-amber-400/30"
                  : "bg-slate-800 hover:bg-amber-600 border border-slate-700 hover:border-amber-500"
              }`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 text-white animate-pulse" />
              ) : (
                <Mic className="w-10 h-10 text-amber-400 hover:text-white" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold">
              {isListening ? t.listening : t.tapToSpeak}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {transcript || t.askAssistantPrompt}
            </p>
          </div>
        </div>

        {/* Answer Box */}
        {(answer || isAnswering) && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant Response</span>
            </div>
            {isAnswering ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">{answer}</p>
            )}
          </div>
        )}

        {/* Quick Sample Questions */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Sample Questions
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Where is the pharmacy?",
              "What are the clinic hours?",
              "Where is parking located?",
              "I want to check in",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleQuickQuestion(q)}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessQuery(typedQuery);
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={typedQuery}
            onChange={(e) => setTypedQuery(e.target.value)}
            placeholder="Or type a question..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
