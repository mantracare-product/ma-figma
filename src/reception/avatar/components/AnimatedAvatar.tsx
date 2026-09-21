/**
 * AnimatedAvatar.tsx
 * Path: src/reception/avatar/components/AnimatedAvatar.tsx
 *
 * Mantra AI Receptionist Avatar (Aria) - Ultra-smooth Lip-Sync Video & Glassmorphic Presence
 * Strictly implements DESIGN_NAVODYA.md (Clinical Glassmorphic System):
 * - Exactly ONE Aria visual on stage at all times (the lip-sync video, paused on rest frame or playing)
 * - Container-query based sizing via avatarStage.css with aspect ratio computed from video metadata
 * - Compact glass chip overlay for name, role, and state badge
 * - State-driven playback with rest frame synchronization (no crossfading, no frozen open mouths)
 * - Ambient radial presence glow behind upper body
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Mic, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import avatarWebm from '@/imports/ai-receptionist-avatar.webm';
import avatarMp4 from '@/imports/ai-receptionist-avatar.mp4';
import avatarFallbackPng from '@/imports/avatar-fallback.png';
import '../../styles/avatarStage.css';

export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'success' | 'apologetic';

export interface AnimatedAvatarProps {
  state: AvatarState;
  avatarName?: string;
  thinkingMessage?: string;
  className?: string;
  speechRate?: number;
  onInterrupt?: () => void;
}

export const GLOW: Record<AvatarState, string> = {
  speaking: 'rgba(20,86,240,.35)',
  listening: 'rgba(59,130,246,.30)',
  thinking: 'rgba(96,165,250,.28)',
  success: 'rgba(16,185,129,.35)',
  apologetic: 'rgba(100,116,139,.22)',
  idle: 'rgba(37,99,235,.15)',
};

/**
 * Timestamps (in seconds) where Aria's mouth is completely closed and relaxed.
 * Used to ensure speech ends cleanly without stopping mid-word.
 */
export const REST_POINTS: readonly number[] = [
  0.0,
  1.0,
  1.25,
  3.75,
  4.85,
  5.85,
  7.0,
  8.6,
  9.2,
  9.6,
  9.96,
];

const LOOP_END_THRESHOLD = 9.92;
const LOOP_START_TIME = 0.0;

export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  state = 'idle',
  avatarName = 'Aria',
  thinkingMessage = 'Looking up clinic schedule...',
  className = '',
  speechRate = 1.0,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ar, setAr] = useState<number | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  const speechRateRef = useRef<number>(speechRate);
  speechRateRef.current = speechRate;

  const stoppingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Sync playbackRate slightly with speech rate (clamped 0.90 to 1.10)
  useEffect(() => {
    if (videoRef.current) {
      const rate = Math.min(Math.max(speechRate, 0.90), 1.10);
      videoRef.current.playbackRate = rate;
    }
  }, [speechRate]);

  // Find next rest point strictly ahead
  const getNextRestPoint = useCallback((currentTime: number): number => {
    for (const pt of REST_POINTS) {
      if (pt > currentTime) {
        return pt;
      }
    }
    return REST_POINTS[0];
  }, []);

  // Find nearest rest point on either side
  const getNearestRestPoint = useCallback((currentTime: number): number => {
    let nearest = REST_POINTS[0];
    let minDiff = Math.abs(currentTime - nearest);
    for (const pt of REST_POINTS) {
      const diff = Math.abs(currentTime - pt);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = pt;
      }
    }
    return nearest;
  }, []);

  // Play routine: play from current rest frame
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion || videoError) return;

    if (stoppingTimerRef.current) {
      clearTimeout(stoppingTimerRef.current);
      stoppingTimerRef.current = null;
    }

    try {
      video.playbackRate = Math.min(Math.max(speechRateRef.current, 0.90), 1.10);
      await video.play();
      isPlayingRef.current = true;
    } catch (err: any) {
      console.warn('Avatar video play pending gesture:', err?.message || err);
      const unlockOnTouch = async () => {
        try {
          if (videoRef.current && stateRef.current === 'speaking') {
            await videoRef.current.play();
            isPlayingRef.current = true;
          }
        } catch {}
        window.removeEventListener('pointerdown', unlockOnTouch);
        window.removeEventListener('keydown', unlockOnTouch);
      };
      window.addEventListener('pointerdown', unlockOnTouch, { once: true });
      window.addEventListener('keydown', unlockOnTouch, { once: true });
    }
  }, [prefersReducedMotion, videoError]);

  // Stop routine:
  // If the next REST_POINT is <= 700ms ahead, keep playing until it and pause;
  // otherwise seek immediately to the nearest REST_POINT (either side) and pause.
  const safeStop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stoppingTimerRef.current) {
      clearTimeout(stoppingTimerRef.current);
      stoppingTimerRef.current = null;
    }

    const curTime = video.currentTime;
    const nextRest = getNextRestPoint(curTime);
    let timeToRest = (nextRest - curTime) * 1000;
    if (timeToRest < 0) {
      timeToRest += 10000;
    }

    if (timeToRest <= 700) {
      stoppingTimerRef.current = setTimeout(() => {
        if (stateRef.current !== 'speaking' && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = nextRest >= LOOP_END_THRESHOLD ? REST_POINTS[0] : nextRest;
          isPlayingRef.current = false;
        }
      }, timeToRest);
    } else {
      video.pause();
      const nearest = getNearestRestPoint(curTime);
      video.currentTime = nearest >= LOOP_END_THRESHOLD ? REST_POINTS[0] : nearest;
      isPlayingRef.current = false;
    }
  }, [getNextRestPoint, getNearestRestPoint]);

  // Handle State Changes
  useEffect(() => {
    if (state === 'speaking') {
      safePlay();
    } else {
      safeStop();
    }
  }, [state, safePlay, safeStop]);

  // Seamless Manual Loop Handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rvfcId: number | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const checkLoop = () => {
      if (video.currentTime >= LOOP_END_THRESHOLD && isPlayingRef.current) {
        video.currentTime = LOOP_START_TIME;
      }
      if ('requestVideoFrameCallback' in video) {
        rvfcId = (video as any).requestVideoFrameCallback(checkLoop);
      }
    };

    if ('requestVideoFrameCallback' in video) {
      rvfcId = (video as any).requestVideoFrameCallback(checkLoop);
    } else {
      fallbackInterval = setInterval(checkLoop, 25);
    }

    return () => {
      if (rvfcId !== null && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(rvfcId);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [ready]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.videoWidth && v.videoHeight) {
      setAr(v.videoWidth / v.videoHeight);
    }
    v.currentTime = REST_POINTS[0];
  };

  const onLoadedData = () => {
    setReady(true);
  };

  const handleVideoError = () => {
    console.warn('Avatar video failed to load, falling back to static poster.');
    setVideoError(true);
  };

  return (
    <div className={`avatar-stage ${className}`}>
      {/* 1. Presence glow */}
      <div className="avatar-glow" style={{ background: GLOW[state] || GLOW.idle }} />

      {/* 2. Scaled avatar figure with EXACTLY ONE video layer */}
      {videoError ? (
        <img className="avatar-fallback" src={avatarFallbackPng} alt={avatarName} />
      ) : (
        <div className="avatar-figure" style={{ ['--ar' as any]: ar ?? 0.75 }}>
          <video
            ref={videoRef}
            className="avatar-layer"
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={onLoadedMetadata}
            onLoadedData={onLoadedData}
            onError={handleVideoError}
            style={{
              opacity: ready ? 1 : 0,
              transition: 'opacity 200ms var(--ease-out, ease-out)',
            }}
          >
            <source src={avatarWebm} type="video/webm" />
            <source src={avatarMp4} type="video/mp4" />
          </video>
        </div>
      )}

      {/* 3. Compact Glass Chip Overlay */}
      <div className="avatar-chip">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181e25]/80 backdrop-blur-xl border border-white/20 shadow-lg text-white pointer-events-none whitespace-nowrap">
          {state === 'speaking' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <Volume2 className="h-3.5 w-3.5 text-blue-400 animate-pulse" strokeWidth={2.2} />
              <span>Speaking</span>
            </span>
          )}
          {state === 'listening' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <Mic className="h-3.5 w-3.5 text-blue-400 animate-bounce" strokeWidth={2.2} />
              <span>Listening</span>
            </span>
          )}
          {state === 'thinking' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-300 animate-spin" strokeWidth={2.2} />
              <span>{thinkingMessage || 'Thinking'}</span>
            </span>
          )}
          {state === 'success' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.2} />
              <span>Verified</span>
            </span>
          )}
          {state === 'apologetic' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-300" strokeWidth={2.2} />
              <span>Assistance</span>
            </span>
          )}
          {state === 'idle' && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span>Ready</span>
            </span>
          )}

          <span className="w-1 h-1 rounded-full bg-white/30" />

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-white font-display">{avatarName}</span>
            <span className="text-xs text-slate-300 font-medium">• Virtual AI Receptionist</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedAvatar;
