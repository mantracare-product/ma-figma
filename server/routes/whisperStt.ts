import { pipeline, env } from '@xenova/transformers';
import * as wavefileModule from 'wavefile';
import os from 'os';
import path from 'path';

// Fix read-only filesystem on Vercel / AWS Lambda
env.allowLocalModels = false;
env.useBrowserCache = false;
if (typeof process !== 'undefined' && (process.env?.VERCEL || process.env?.AWS_LAMBDA_FUNCTION_NAME || process.env?.NODE_ENV === 'production')) {
  try {
    env.cacheDir = path.join(os.tmpdir(), '.transformers_cache');
  } catch {}
}

const WaveFile: any =
  (wavefileModule as any).WaveFile ||
  (wavefileModule as any).default?.WaveFile ||
  (wavefileModule as any).default ||
  wavefileModule;

let transcriberPromise: Promise<any> | null = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    console.log('[Whisper Server] ⚙️ Initializing Whisper ASR pipeline (Xenova/whisper-tiny)...');
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  }
  return transcriberPromise;
}

/**
 * Cloud Whisper transcription via Groq or OpenAI API
 */
async function transcribeViaCloud(buffer: Buffer, language?: string): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) return null;

  try {
    const isGroq = Boolean(groqKey);
    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';
    const apiKey = isGroq ? groqKey : openaiKey;
    const model = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1';

    const formData = new FormData();
    const blob = new Blob([buffer as unknown as BlobPart], { type: 'audio/wav' });
    formData.append('file', blob, 'recording.wav');
    formData.append('model', model);
    if (language && language !== 'auto') {
      formData.append('language', language === 'hi' ? 'hi' : 'en');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Whisper Server] Cloud STT (${isGroq ? 'Groq' : 'OpenAI'}) error:`, res.status, errText);
      return null;
    }

    const data: any = await res.json();
    return data?.text || '';
  } catch (err) {
    console.warn('[Whisper Server] Cloud STT request exception:', err);
    return null;
  }
}

export interface WhisperTranscribeRequest {
  audioBase64: string; // Base64-encoded WAV or PCM audio
  language?: string; // 'en' | 'hi' | 'auto'
}

export interface WhisperTranscribeResponse {
  text: string;
  language?: string;
  isNoise?: boolean;
  durationSeconds?: number;
  error?: string;
}

export async function handleWhisperTranscribeRequest(
  body: WhisperTranscribeRequest
): Promise<WhisperTranscribeResponse> {
  const startTime = Date.now();
  try {
    if (!body || !body.audioBase64) {
      console.warn('[Whisper Server] ⚠️ Received empty audio payload');
      return { text: '', error: 'Missing audioBase64 in request' };
    }

    const buffer = Buffer.from(body.audioBase64, 'base64');

    // 1. Fast Path: Use Cloud API (Groq / OpenAI) if key is provided
    const cloudText = await transcribeViaCloud(buffer, body.language);
    if (cloudText !== null) {
      const inferenceTimeMs = Date.now() - startTime;
      const cleanText = cloudText
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log(`[Whisper Server] ⚡ Cloud Whisper Transcribed (${inferenceTimeMs}ms): "${cleanText}"`);
      return {
        text: cleanText,
        durationSeconds: 1,
      };
    }

    // 2. Local / Serverless ONNX Fallback
    const transcriber = await getTranscriber();

    const wav = new WaveFile(buffer);
    wav.toSampleRate(16000);
    wav.toBitDepth('32f');

    let audioData: any = wav.getSamples(false, Float32Array);
    if (Array.isArray(audioData)) {
      audioData = audioData[0];
    }

    if (!audioData || audioData.length === 0) {
      console.warn('[Whisper Server] ⚠️ No audio samples found in WAV buffer');
      return { text: '', durationSeconds: 0 };
    }

    const durationSeconds = Number((audioData.length / 16000).toFixed(2));

    // Peak normalization: boost quiet recordings to 0.85 peak amplitude
    let maxPeak = 0;
    for (let i = 0; i < audioData.length; i++) {
      const absVal = Math.abs(audioData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }

    if (maxPeak > 0.005 && maxPeak < 0.7) {
      const gainFactor = Math.min(10, 0.85 / maxPeak);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] *= gainFactor;
      }
      console.log(`[Whisper Server] 🔊 Peak normalized audio (peak: ${maxPeak.toFixed(3)} -> ${(maxPeak * gainFactor).toFixed(3)}, gain: ${gainFactor.toFixed(1)}x)`);
    }

    console.log(
      `[Whisper Server] 🎙️ Audio received: ${buffer.length} bytes, ${durationSeconds}s duration (language: ${body.language || 'en'}, peak: ${maxPeak.toFixed(3)})`
    );

    const options: any = {
      chunk_length_s: 30,
      stride_length_s: 5,
      sampling_rate: 16000,
      task: 'transcribe',
    };

    if (body.language && body.language !== 'auto') {
      options.language = body.language === 'hi' ? 'hindi' : 'english';
    }

    const output = await transcriber(audioData, options);
    const inferenceTimeMs = Date.now() - startTime;
    let rawText = typeof output?.text === 'string' ? output.text : '';
    rawText = rawText.trim();

    console.log(`[Whisper Server] 📝 Raw Whisper Output (${inferenceTimeMs}ms): "${rawText}"`);

    // 1. Remove bracketed / parenthesized noise annotations like (coughing), [applause], (sighs), etc.
    const isPureNoise = /^\s*(\([^)]*\)|\[[^\]]*\]|\*.*\*|thank you for watching|thanks for watching|subtitles by.*)\s*$/i.test(rawText);
    
    // 2. Strip embedded noise tags while preserving real spoken words
    let cleanText = rawText
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (isPureNoise || cleanText.length < 2) {
      console.log(`[Whisper Server] 🔇 Ignored non-speech noise tag / silence: "${rawText}"`);
      return {
        text: '',
        isNoise: true,
        durationSeconds,
      };
    }

    console.log(`[Whisper Server] ✅ Final Transcribed Text: "${cleanText}" (inference: ${inferenceTimeMs}ms)`);
    return {
      text: cleanText,
      durationSeconds,
    };
  } catch (err: any) {
    console.error('[Whisper Server] ❌ Transcription error:', err);
    return {
      text: '',
      error: String(err?.message || err),
    };
  }
}
