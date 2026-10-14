/**
 * LiveCaptionBar.tsx
 * Path: src/reception/avatar/components/LiveCaptionBar.tsx
 *
 * Real-time subtitle caption bar matching DESIGN_NAVODYA.md:
 * - Glass Base card background with specular highlight
 * - Streaming Caret (2px blue-600, 530ms)
 * - Accessible high-contrast typography (AAA/AA floor)
 */

import React from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

interface LiveCaptionBarProps {
  captionText: string;
  isSpeaking: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const LiveCaptionBar: React.FC<LiveCaptionBarProps> = ({
  captionText,
  isSpeaking,
  isMuted = false,
  onToggleMute,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="navodya-glass-card p-4 sm:p-5 transition-all duration-300">
        {/* Caption Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {isSpeaking ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
                </>
              ) : (
                <span className="inline-flex rounded-full h-2 w-2 bg-slate-400" />
              )}
            </span>
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1 font-['DM_Sans']">
              <Sparkles className="w-3.5 h-3.5 text-[#1456f0]" /> Aria Spoken Caption
            </span>
          </div>

          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#45515e] hover:text-[#1456f0] px-2.5 py-1 rounded-full bg-white border border-[#e2e8f0] shadow-xs hover:border-[#bfdbfe] transition-colors"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#dc2626]" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Voice On</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Dynamic Spoken Text with Streaming Caret */}
        <div className="min-h-[48px] flex items-center" aria-live="polite">
          <p className="text-base sm:text-lg font-medium text-[#222222] leading-relaxed font-['DM_Sans']">
            {captionText || 'Welcome to MantraCare. Please touch an option below to begin.'}
            {isSpeaking && <span className="navodya-caret" />}
          </p>
        </div>
      </div>
    </div>
  );
};
