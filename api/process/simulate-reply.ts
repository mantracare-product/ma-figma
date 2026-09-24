import { handleSimulateStageReplyRequest } from '../../server/routes/simulateStageReply';

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
      body = JSON.parse(body);
    }
    const result = await handleSimulateStageReplyRequest(body);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[API /api/process/simulate-reply] Error:', error);
    return res.status(500).json({ error: 'Simulation failed', detail: String(error?.message || error) });
  }
}
