import { handleWhisperTranscribeRequest } from '../../server/routes/whisperStt';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    const result = await handleWhisperTranscribeRequest(body);
    if (result.error) {
      const statusCode = result.upstreamStatus || 500;
      return res.status(statusCode).json(result);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[API /api/stt/transcribe] Serverless function error:', error?.message || error);
    return res.status(500).json({ error: 'Transcription failed', detail: String(error?.message || error) });
  }
}
