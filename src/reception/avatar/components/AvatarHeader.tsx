/**
 * AvatarHeader.tsx
 * Path: src/reception/avatar/components/AvatarHeader.tsx
 *
 * Header for the AI Receptionist Avatar Screen:
 * - Clinic branding
 * - Live clock & date
 * - Active session 60s inactivity countdown & Reset button
 * - Language selector (EN, HI, ES)
 */

import React, { useState, useEffect } from 'react';
import { Activity, Clock, RotateCcw, Globe } from 'lucide-react';

interface AvatarHeaderProps {
  clinicName?: string;
  inactivityRemainingSeconds?: number | null;
  onResetSession: () => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  clinicName = 'MantraCare Health Center',
  inactivityRemainingSeconds = null,
  onResetSession,
  currentLanguage,
  onLanguageChange,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-slate-900/80 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md z-40">
      {/* Clinic Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 font-['Outfit']">
            {clinicName}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
              Self Check-in
            </span>
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">AI Virtual Concierge</p>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{currentDate}</span>
          <span className="text-slate-500">|</span>
          <span className="font-bold text-white">{currentTime}</span>
        </div>

        {/* 60s Inactivity Countdown Warning */}
        {inactivityRemainingSeconds !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
            <span>Reset in {inactivityRemainingSeconds}s</span>
            <button
              onClick={onResetSession}
              className="p-1 hover:bg-amber-500/20 rounded-md transition-colors"
              title="Reset session now"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 hidden sm:inline" />
          {[
            { code: 'en', label: 'EN' },
            { code: 'hi', label: 'हिन्दी' },
            { code: 'es', label: 'ES' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentLanguage === lang.code
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Reset / Start Over Button */}
        {inactivityRemainingSeconds === null && (
          <button
            onClick={onResetSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
        )}
      </div>
    </header>
  );
};
