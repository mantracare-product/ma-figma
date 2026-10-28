export interface OnboardingExtractRequest {
  step: string;
  userMessage: string;
  context?: {
    category?: string;
    requirements?: string[];
    locations?: string[];
    primaryLocation?: string;
    teamSize?: string;
  };
}

export interface OnboardingExtractResponse {
  intent: "answer" | "skip" | "correction" | "unclear" | "yes" | "no";
  extracted: {
    category?: string | null;
    requirements?: string[] | null;
    callVolume?: string | null;
    internationalCalls?: boolean | null;
    locations?: string[] | null;
    primaryLocation?: string | null;
    operatingHours?: string | null;
    teamSize?: string | null;
    telephony?: "bring_own" | "default" | null;
  };
  acknowledgement: string;
  unconfigured?: boolean;
  error?: string;
}

export async function handleOnboardingExtractRequest(
  body: OnboardingExtractRequest
): Promise<OnboardingExtractResponse> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return {
      intent: "answer",
      extracted: {},
      acknowledgement: "",
      unconfigured: true,
    };
  }

  const { step, userMessage, context } = body;

  const systemPrompt = `You are the NLU parser for an AI front desk onboarding conversation at MantraAssist.
Your job is to analyze the user's spoken or typed reply for the current onboarding step.

Current Step: "${step}"
Known Context: ${JSON.stringify(context || {})}

Return a JSON object with this exact shape:
{
  "intent": "answer" | "skip" | "correction" | "unclear" | "yes" | "no",
  "extracted": {
    "category": string or null,
    "requirements": array of strings (subset of ["AI Reception", "Scribe", "EHR", "RCM"]) or null,
    "callVolume": string or null,
    "internationalCalls": boolean or null,
    "locations": array of strings or null,
    "primaryLocation": string or null,
    "operatingHours": string or null,
    "teamSize": string or null,
    "telephony": "bring_own" | "default" | null
  },
  "acknowledgement": string
}

CONVERSATION RULES:
- Never use confirmation words like "confirmed", "noted", "recorded", "got it", "availability set to".
- Acknowledge naturally by reflecting what the user said in a short, varied sentence (e.g. if user says "mostly missed calls after 6pm" -> "Missed calls after hours, that's a common one for clinics.").
- If the user skipped, acknowledge lightly ("No problem." or "Moving right along."). Never say "you can add it later".
- Do not echo raw text back verbatim.
- Team size is ONLY extracted when step is "TEAM_SIZE". Digits from hours or phone calls must NEVER be extracted as team size.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return {
        intent: "answer",
        extracted: {},
        acknowledgement: "",
        unconfigured: true,
        error: `Groq error status ${res.status}`,
      };
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    const cleanAck = (parsed.acknowledgement || "")
      .replace(/a\s+team\s+of\s+team\s+of/gi, "a team of")
      .replace(/team\s+of\s+team\s+of/gi, "team of");

    return {
      intent: parsed.intent || "answer",
      extracted: parsed.extracted || {},
      acknowledgement: cleanAck,
    };
  } catch (err: any) {
    return {
      intent: "answer",
      extracted: {},
      acknowledgement: "",
      unconfigured: true,
      error: String(err?.message || err),
    };
  }
}
