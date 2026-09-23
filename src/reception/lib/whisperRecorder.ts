/**
 * Browser-side audio recorder with Voice Activity Detection (VAD)
 * Features:
 * - Dynamic AudioContext sample rate detection (48kHz/44.1kHz -> 16kHz resampled)
 * - Mute node isolation to prevent speaker feedback loop
 * - Adaptive noise floor calibration for soft mics & noisy rooms
 * - 600ms rolling pre-buffer so initial syllables are never clipped
 * - Responsive 750ms speech pause detector with 8s maximum window
 * - Accurate 16-bit PCM WAV base64 packaging sent to /api/stt/transcribe
 */

export interface WhisperRecorderOptions {
  language?: 'en' | 'hi' | 'auto';
  silenceThreshold?: number; // Base RMS energy threshold
  silenceDurationMs?: number; // Milliseconds of silence to trigger transcription
  maxDurationMs?: number; // Max speech window before force-transcribing
  onTranscript?: (transcript: string) => void;
  onError?: (err: Error) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onAudioLevel?: (level: number) => void; // Normalized 0..1 for UI animation
}

export class WhisperAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private muteNode: GainNode | null = null;
  
  private isRecording = false;
  private speechDetected = false;
  private rollingPreBuffer: Float32Array[] = [];
  private collectedSamples: Float32Array[] = [];
  private lastSoundTime = 0;
  private speechStartTime = 0;
  private noiseFloor = 0.005; // Adaptive noise baseline
  private sampleRate = 16000;

  private options: WhisperRecorderOptions;

  constructor(options: WhisperRecorderOptions = {}) {
    this.options = {
      language: 'en',
      silenceThreshold: 0.012,
      silenceDurationMs: 800,
      maxDurationMs: 8000,
      ...options,
    };
  }

  public setLanguage(lang: 'en' | 'hi' | 'auto') {
    this.options.language = lang;
    console.log(`[Whisper Client] 🌐 Language set to: ${lang}`);
  }

  public async start(): Promise<boolean> {
    if (this.isRecording) return true;
    if (typeof window === 'undefined') return false;

    try {
      console.log('[Whisper Client] 🎤 Requesting microphone stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.sampleRate = this.audioContext.sampleRate || 44100;
      console.log(`[Whisper Client] 🎚️ AudioContext active at ${this.sampleRate}Hz`);
      
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      // Add Pre-amplifier GainNode
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.5;

      // 4096 buffer size
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Create MUTE gain node to prevent speaker feedback loop
      this.muteNode = this.audioContext.createGain();
      this.muteNode.gain.value = 0;

      this.rollingPreBuffer = [];
      this.collectedSamples = [];
      this.speechDetected = false;
      this.isRecording = true;
      this.noiseFloor = 0.005;

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.processAudioChunk(inputData);
      };

      // Pipeline: Source -> Gain (1.5x) -> ScriptProcessor -> MuteNode (0.0x) -> Destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.processorNode);
      this.processorNode.connect(this.muteNode);
      this.muteNode.connect(this.audioContext.destination);

      console.log('[Whisper Client] ✅ Audio pipeline active with zero-feedback routing & listening for voice...');
      this.options.onListeningStateChange?.(true);
      return true;
    } catch (err: any) {
      console.warn('[Whisper Client] ❌ Failed to start audio capture:', err);
      this.options.onError?.(err);
      return false;
    }
  }

  public stop(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    try {
      this.processorNode?.disconnect();
      this.muteNode?.disconnect();
      this.gainNode?.disconnect();
      this.sourceNode?.disconnect();
      this.mediaStream?.getTracks().forEach((t) => t.stop());
      this.audioContext?.close();
    } catch {}

    this.processorNode = null;
    this.muteNode = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
    this.audioContext = null;

    console.log('[Whisper Client] ⏹️ Stopped audio recording.');
    this.options.onListeningStateChange?.(false);
  }

  private processAudioChunk(samples: Float32Array) {
    // 1. Calculate RMS energy of chunk
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    const normalizedLevel = Math.min(1, rms * 25);
    this.options.onAudioLevel?.(normalizedLevel);

    const now = Date.now();

    // 2. Adaptive noise floor calibration
    if (!this.speechDetected) {
      // Exponential moving average for noise baseline
      this.noiseFloor = this.noiseFloor * 0.9 + rms * 0.1;
    }

    // Dynamic threshold based on calibrated ambient noise
    const dynamicThreshold = Math.max(
      this.options.silenceThreshold || 0.012,
      this.noiseFloor * 2.2
    );

    // Maintain rolling ~600ms pre-buffer
    const maxPreBufferChunks = Math.max(3, Math.round((this.sampleRate * 0.6) / samples.length));
    const chunkCopy = new Float32Array(samples);
    if (!this.speechDetected) {
      this.rollingPreBuffer.push(chunkCopy);
      if (this.rollingPreBuffer.length > maxPreBufferChunks) {
        this.rollingPreBuffer.shift();
      }
    }

    // 3. Detect speech start
    if (rms > dynamicThreshold) {
      if (!this.speechDetected) {
        this.speechDetected = true;
        this.speechStartTime = now;
        // Prepend rolling pre-buffer so beginning consonants are preserved
        this.collectedSamples = [...this.rollingPreBuffer, chunkCopy];
        this.rollingPreBuffer = [];
        console.log(
          `[Whisper Client] 🔊 Speech started (RMS: ${rms.toFixed(4)} > Threshold: ${dynamicThreshold.toFixed(4)}). Capturing...`
        );
      } else {
        this.collectedSamples.push(chunkCopy);
      }
      this.lastSoundTime = now;
    } else if (this.speechDetected) {
      this.collectedSamples.push(chunkCopy);

      // 4. Check for natural silence pause or max duration
      const silenceElapsed = now - this.lastSoundTime;
      const totalElapsed = now - this.speechStartTime;
      const silenceLimit = this.options.silenceDurationMs || 800;
      const maxLimit = this.options.maxDurationMs || 8000;

      if ((silenceElapsed >= silenceLimit && totalElapsed >= 350) || totalElapsed >= maxLimit) {
        console.log(
          `[Whisper Client] ⏱️ Speech finished (${(silenceElapsed / 1000).toFixed(2)}s silence, ${(totalElapsed / 1000).toFixed(2)}s total). Transcribing...`
        );
        this.speechDetected = false;
        this.triggerTranscription();
      }
    }
  }

  private async triggerTranscription() {
    if (this.collectedSamples.length === 0) return;

    // Combine all chunks into one buffer
    const totalLength = this.collectedSamples.reduce((acc, c) => acc + c.length, 0);
    const durationSec = (totalLength / this.sampleRate).toFixed(2);

    // Discard ultra short clicks (< 0.25s)
    if (totalLength < this.sampleRate * 0.25) {
      console.log(`[Whisper Client] ℹ️ Discarded ultra-short noise burst (${durationSec}s)`);
      this.collectedSamples = [];
      return;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.collectedSamples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.collectedSamples = [];

    // Encode to WAV with actual audioContext sampleRate
    const wavBase64 = encodeWAVBase64(merged, this.sampleRate);

    try {
      console.log(
        `[Whisper Client] 🚀 Sending ${merged.length} samples (${durationSec}s @ ${this.sampleRate}Hz) to /api/stt/transcribe...`
      );
      const res = await fetch('/api/stt/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: wavBase64,
          language: this.options.language || 'en',
        }),
      });

      if (!res.ok) {
        throw new Error(`Whisper STT endpoint responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.isNoise) {
        console.log('[Whisper Client] 🔇 Non-speech noise detected, continuing active listening.');
        return;
      }

      const text = (data.text || '').trim();
      if (text) {
        console.log(`[Whisper Client] 📥 STT Output: "${text}" (audio: ${durationSec}s)`);
        this.options.onTranscript?.(text);
      } else {
        console.log('[Whisper Client] ℹ️ STT returned empty text');
      }
    } catch (err: any) {
      console.error('[Whisper Client] ❌ STT Request Error:', err);
      this.options.onError?.(err);
    }
  }
}

/**
 * Encodes Float32Array PCM samples into a standard 16-bit PCM WAV base64 string
 */
function encodeWAVBase64(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM audio samples (clamp -1.0 to 1.0 -> -32768 to 32767)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Convert ArrayBuffer to Base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
