/**
 * Server-side Thin STT Proxy to Groq Whisper API
 * Replaces local ONNX/@xenova/transformers to prevent serverless function crashes & cold-boot timeouts.
 */

// Model constant - default: whisper-large-v3-turbo (switchable to whisper-large-v3 if Hindi nuance requires)
export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

export interface WhisperTranscribeRequest {
  audioBase64: string; // Base64-encoded 16-bit PCM WAV audio (16kHz mono)
  language?: string; // 'en' | 'hi' | 'auto'
}

export interface WhisperTranscribeResponse {
  text: string;
  language?: string;
  isNoise?: boolean;
  durationSeconds?: number;
  error?: string;
  upstreamStatus?: number;
}

/**
 * Handles incoming STT requests by forwarding audio to Groq Whisper endpoint.
 * Reads process.env.GROQ_API_KEY server-side only.
 */
export async function handleWhisperTranscribeRequest(
  body: WhisperTranscribeRequest
): Promise<WhisperTranscribeResponse> {
  const startTime = Date.now();

  try {
    if (!body || !body.audioBase64) {
      console.warn('[STT Server] ⚠️ Received empty audio payload');
      return { text: '', error: 'Missing audioBase64 in request', upstreamStatus: 400 };
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('[STT Server] ❌ GROQ_API_KEY is not configured on server');
      return {
        text: '',
        error: 'GROQ_API_KEY is not configured on the server',
        upstreamStatus: 500,
      };
    }

    // Decode Base64 audio into binary buffer and Blob
    const audioBuffer = Buffer.from(body.audioBase64, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', GROQ_WHISPER_MODEL);
    formData.append('temperature', '0');
    formData.append('response_format', 'json');

    const targetLang = (body.language === 'hi' || body.language === 'hindi') ? 'hi' : 'en';
    formData.append('language', targetLang);

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // Log upstream status and technical error message without logging audio or transcript content
      console.error(`[STT Server] ❌ Groq STT upstream error (HTTP ${res.status}): ${errText}`);
      return {
        text: '',
        error: `Groq STT API returned HTTP ${res.status}`,
        upstreamStatus: res.status,
      };
    }

    const data: any = await res.json();
    const rawText: string = typeof data?.text === 'string' ? data.text : '';
    const inferenceTimeMs = Date.now() - startTime;

    // Post-processing: Remove bracketed/parenthesized noise annotations & hallucinations
    const isPureNoise = /^\s*(\([^)]*\)|\[[^\]]*\]|\*.*\*|thank you for watching|thanks for watching|subtitles by.*|amara\.org)\s*$/i.test(
      rawText.trim()
    );

    const cleanText = rawText
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\*.*?\*/g, ' ')
      .replace(/(thank you for watching|thanks for watching|subtitles by.*|amara\.org)/gi, ' ')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (isPureNoise || cleanText.length < 2) {
      console.log(`[STT Server] 🔇 Filtered non-speech noise / hallucination (${inferenceTimeMs}ms)`);
      return {
        text: '',
        isNoise: true,
      };
    }

    console.log(
      `[STT Server] ⚡ Groq Whisper transcribed successfully (${inferenceTimeMs}ms, model: ${GROQ_WHISPER_MODEL}, lang: ${targetLang})`
    );
    return {
      text: cleanText,
    };
  } catch (err: any) {
    console.error('[STT Server] ❌ Transcription exception:', err?.message || err);
    return {
      text: '',
      error: String(err?.message || err),
      upstreamStatus: 500,
    };
  }
}
