import type { IncomingMessage, ServerResponse } from 'http';

export interface TtsRequest {
  text: string;
  language?: string; // 'en' | 'hi' | 'auto' | string
  voice?: string;
  provider?: 'elevenlabs' | 'openai';
}

export interface TtsResponse {
  ok?: boolean;
  error?: string;
  unconfigured?: boolean;
  upstreamStatus?: number;
  contentType?: string;
  audioBuffer?: Buffer;
}

let hasWarnedMissingTtsKey = false;

export function getTtsStatus() {
  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.TTS_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const configured = Boolean(elevenKey || openAiKey);
  const provider = process.env.TTS_PROVIDER || (elevenKey ? 'elevenlabs' : openAiKey ? 'openai' : 'none');

  return {
    ok: true,
    hasKey: configured,
    provider,
    model: provider === 'elevenlabs' ? 'eleven_multilingual_v2' : 'tts-1',
  };
}

/**
 * Server-side Neural TTS Handler
 * Supports ElevenLabs and OpenAI TTS with server-side environment variables.
 * Falls back cleanly with unconfigured: true if keys are not set.
 */
export async function handleTtsRequest(body: TtsRequest): Promise<TtsResponse> {
  const text = body?.text?.trim();
  if (!text) {
    return { error: 'Missing text in TTS request', upstreamStatus: 400 };
  }

  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.TTS_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const preferredProvider = process.env.TTS_PROVIDER?.toLowerCase();

  // If no API keys configured
  if (!elevenKey && !openAiKey) {
    if (!hasWarnedMissingTtsKey) {
      hasWarnedMissingTtsKey = true;
      console.warn('[TTS Server] ELEVENLABS_API_KEY or OPENAI_API_KEY is not configured. Web client will use browser speechSynthesis fallback.');
    }
    return {
      error: 'TTS API key is not configured on server (ELEVENLABS_API_KEY or OPENAI_API_KEY)',
      unconfigured: true,
      upstreamStatus: 503,
    };
  }

  const useElevenLabs = preferredProvider === 'elevenlabs' || (elevenKey && preferredProvider !== 'openai');

  // 1. ElevenLabs Multilingual Neural TTS
  if (useElevenLabs && elevenKey) {
    try {
      // Default voice: '21m00Tcm4TlvDq8ikWAM' (Rachel - natural female voice)
      const voiceId = process.env.ELEVENLABS_VOICE_ID || body.voice || '21m00Tcm4TlvDq8ikWAM';
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[TTS Server] ElevenLabs returned ${res.status}:`, errorText);
        return {
          error: `ElevenLabs TTS upstream error: ${res.statusText}`,
          upstreamStatus: res.status,
        };
      }

      const arrayBuffer = await res.arrayBuffer();
      return {
        ok: true,
        contentType: 'audio/mpeg',
        audioBuffer: Buffer.from(arrayBuffer),
      };
    } catch (err: any) {
      console.error('[TTS Server] ElevenLabs request failed:', err);
      return {
        error: `ElevenLabs TTS failed: ${err?.message || err}`,
        upstreamStatus: 500,
      };
    }
  }

  // 2. OpenAI Speech TTS
  if (openAiKey) {
    try {
      const voice = process.env.OPENAI_TTS_VOICE || body.voice || 'nova';
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          response_format: 'mp3',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[TTS Server] OpenAI returned ${res.status}:`, errorText);
        return {
          error: `OpenAI TTS upstream error: ${res.statusText}`,
          upstreamStatus: res.status,
        };
      }

      const arrayBuffer = await res.arrayBuffer();
      return {
        ok: true,
        contentType: 'audio/mpeg',
        audioBuffer: Buffer.from(arrayBuffer),
      };
    } catch (err: any) {
      console.error('[TTS Server] OpenAI request failed:', err);
      return {
        error: `OpenAI TTS failed: ${err?.message || err}`,
        upstreamStatus: 500,
      };
    }
  }

  return {
    error: 'No active TTS provider found',
    unconfigured: true,
    upstreamStatus: 503,
  };
}

/**
 * Self-contained Vercel Serverless Function Handler
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(getTtsStatus());
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        return res.status(400).json({ error: 'Invalid JSON buffer payload' });
      }
    }

    const result = await handleTtsRequest(body || {});
    if (result.error) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(result.upstreamStatus || 500).json({ error: result.error, unconfigured: result.unconfigured });
    }

    res.setHeader('Content-Type', result.contentType || 'audio/mpeg');
    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    console.error('[API /api/tts] Error:', err);
    return res.status(500).json({ error: `TTS handler error: ${err?.message || err}` });
  }
}
