import {
  generateProcessStageReply,
  ProcessSimTurn,
  ProcessSimResult,
  SimOptions,
} from '../../src/lib/processChatSimulator';

export interface SimulateStageReplyRequest {
  stage?: any;
  workflowSteps?: any[];
  userMessage: string;
  history?: ProcessSimTurn[];
  channel?: 'whatsapp' | 'sms' | 'website';
  simOptions?: SimOptions;
}

export interface SimulateStageReplyResponse extends ProcessSimResult {
  error?: string;
}

export async function handleSimulateStageReplyRequest(
  body: SimulateStageReplyRequest
): Promise<SimulateStageReplyResponse> {
  try {
    const {
      stage = { name: 'General Support' },
      workflowSteps = [],
      userMessage = '',
      history = [],
      channel = 'whatsapp',
      simOptions,
    } = body || {};

    const result = generateProcessStageReply(
      stage,
      workflowSteps,
      userMessage,
      history,
      channel,
      simOptions
    );

    return result;
  } catch (err: any) {
    console.error('[Simulate Stage Reply] ❌ Error:', err);
    return {
      text: "Sorry, I couldn't process that response right now.",
      matchedReason: 'Error during simulation execution',
      error: String(err?.message || err),
    };
  }
}
