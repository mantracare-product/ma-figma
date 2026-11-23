/**
 * audioLipsyncManager.ts
 * Path: src/reception/lib/audioLipsyncManager.ts
 *
 * Real-time Audio-driven Lip-Sync & TTS Audio Manager for Aria Avatar.
 * Powered by wawa-lipsync and HTMLAudioElement.
 * Connects /api/tts server audio directly to real-time spectral viseme analysis.
 */

import { Lipsync, VISEMES } from 'wawa-lipsync';

export interface LipsyncFrameData {
  viseme: VISEMES;
  volume: number;
  isSpeaking: boolean;
}

export type SpeechEndCallback = () => void;

class AudioLipsyncManager {
  private audioElement: HTMLAudioElement | null = null;
  private lipsync: Lipsync | null = null;
  private isConnectedToLipsync: boolean = false;
  private isAudioPlaying: boolean = false;
  private currentBlobUrl: string | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private onEndCallbacks: Set<SpeechEndCallback> = new Set();
  private isFallbackMode: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioElement = new Audio();
        this.audioElement.preload = 'auto';
        this.audioElement.crossOrigin = 'anonymous';
      } catch (err) {
        console.warn('[AudioLipsync] Failed to initialize Audio element:', err);
      }
    }
  }

  private initLipsync() {
    if (this.lipsync || typeof window === 'undefined') return;
    try {
      this.lipsync = new Lipsync({ fftSize: 2048, historySize: 10 });
    } catch (err) {
      console.warn('[AudioLipsync] Failed to initialize Lipsync:', err);
    }
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  public isSpeaking(): boolean {
    return this.isAudioPlaying;
  }

  public isUsingFallback(): boolean {
    return this.isFallbackMode;
  }

  /**
   * Safe AudioContext resume on user gesture
   */
  public async unlockAudioContext(): Promise<void> {
    this.initLipsync();
    if (this.lipsync && (this.lipsync as any).audioContext) {
      const ctx = (this.lipsync as any).audioContext as AudioContext;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {}
      }
    }
  }

  /**
   * Ensures the HTMLAudioElement is connected to wawa-lipsync.
   * Note: connectAudio requires audio.src to be set first.
   */
  private connectAudioElement() {
    if (this.isConnectedToLipsync || !this.audioElement || !this.audioElement.src) return;
    this.initLipsync();
    if (!this.lipsync) return;

    try {
      this.lipsync.connectAudio(this.audioElement);
      this.isConnectedToLipsync = true;
    } catch (err) {
      console.warn('[AudioLipsync] Error connecting audio to lipsync:', err);
    }
  }

  /**
   * Stop all current speech (TTS audio and browser speechSynthesis).
   */
  public stopAll(): void {
    this.isAudioPlaying = false;
    this.isFallbackMode = false;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      this.activeUtterance = null;
    }

    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {}
      this.currentBlobUrl = null;
    }

    this.onEndCallbacks.clear();
  }

  /**
   * Synthesize speech via /api/tts, stream into HTMLAudioElement, and analyze with wawa-lipsync.
   * Returns true if audio played successfully, or false if fallback to speechSynthesis is needed.
   */
  public async playTts(
    text: string,
    language: string = 'en',
    onEnd?: SpeechEndCallback
  ): Promise<boolean> {
    this.stopAll();
    this.isFallbackMode = false;

    if (onEnd) {
      this.onEndCallbacks.add(onEnd);
    }

    await this.unlockAudioContext();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language: language === 'hi' ? 'hi' : 'en',
        }),
      });

      if (!res.ok) {
        console.warn(`[AudioLipsync] /api/tts HTTP ${res.status}, falling back to browser speechSynthesis.`);
        return false;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        // If server returned JSON error / unconfigured status
        const json = await res.json().catch(() => ({}));
        console.warn('[AudioLipsync] /api/tts returned JSON (likely unconfigured):', json);
        return false;
      }

      const audioBlob = await res.blob();
      if (!audioBlob || audioBlob.size === 0) {
        console.warn('[AudioLipsync] Received empty audio blob from /api/tts');
        return false;
      }

      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
      }

      const url = URL.createObjectURL(audioBlob);
      this.currentBlobUrl = url;

      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
      }

      const audio = this.audioElement;
      audio.src = url;

      // Connect to wawa-lipsync now that src is set
      this.connectAudioElement();

      return new Promise<boolean>((resolve) => {
        let isResolved = false;

        const handleFinish = () => {
          if (isResolved) return;
          isResolved = true;
          this.isAudioPlaying = false;
          audio.onended = null;
          audio.onerror = null;

          const callbacks = Array.from(this.onEndCallbacks);
          this.onEndCallbacks.clear();
          callbacks.forEach((cb) => {
            try {
              cb();
            } catch (err) {
              console.error('[AudioLipsync] Error in speech onEnd callback:', err);
            }
          });

          resolve(true);
        };

        const handleError = (e: any) => {
          if (isResolved) return;
          isResolved = true;
          this.isAudioPlaying = false;
          audio.onended = null;
          audio.onerror = null;
          console.warn('[AudioLipsync] Audio playback error:', e);
          resolve(false);
        };

        audio.onended = handleFinish;
        audio.onerror = handleError;

        this.isAudioPlaying = true;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.warn('[AudioLipsync] Play blocked (user gesture required):', playErr);
            handleError(playErr);
          });
        }
      });
    } catch (err) {
      console.warn('[AudioLipsync] Fetch /api/tts failed, falling back:', err);
      return false;
    }
  }

  /**
   * Fallback using browser speechSynthesis when /api/tts fails or is unconfigured.
   * As specified: The 3D avatar mouth stays idle in fallback mode.
   */
  public playSpeechSynthesisFallback(
    text: string,
    voice: SpeechSynthesisVoice | null,
    language: string = 'en',
    onEnd?: SpeechEndCallback
  ): void {
    this.stopAll();
    this.isFallbackMode = true;

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.06;

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      }

      utterance.onstart = () => {
        this.isAudioPlaying = false; // Avatar mouth stays idle during speechSynthesis
      };

      utterance.onend = () => {
        this.isFallbackMode = false;
        this.activeUtterance = null;
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isFallbackMode = false;
        this.activeUtterance = null;
        onEnd?.();
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[AudioLipsync] speechSynthesis failed:', err);
      this.isFallbackMode = false;
      onEnd?.();
    }
  }

  /**
   * Called on every animation frame by the 3D Avatar renderer.
   * Computes current viseme and volume from playing audio.
   * If speech is not playing, or during speechSynthesis fallback, returns silence.
   */
  public processFrame(): LipsyncFrameData {
    if (this.isFallbackMode || !this.isAudioPlaying || !this.lipsync || !this.audioElement || this.audioElement.paused) {
      return {
        viseme: VISEMES.sil,
        volume: 0,
        isSpeaking: false,
      };
    }

    try {
      this.lipsync.processAudio();
      const viseme = this.lipsync.viseme || VISEMES.sil;
      const volume = this.lipsync.features?.volume || 0;

      return {
        viseme,
        volume,
        isSpeaking: volume > 0.03 && viseme !== VISEMES.sil,
      };
    } catch {
      return {
        viseme: VISEMES.sil,
        volume: 0,
        isSpeaking: false,
      };
    }
  }
}

export const audioLipsyncManager = new AudioLipsyncManager();
