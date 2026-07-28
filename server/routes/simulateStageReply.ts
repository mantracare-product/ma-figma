import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export async function simulateStageReply(req: any, res: any) {
  const { systemPrompt, transcript, userMessage } = req.body as {
    systemPrompt: string;
    transcript: Array<{ role: "contact" | "ai" | "system"; text: string }>;
    userMessage: string;
  };

  const messages = [
    ...transcript
      .filter((t) => t.role !== "system")
      .map((t) => ({
        role: t.role === "contact" ? ("user" as const) : ("assistant" as const),
        content: t.text,
      })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("\n");

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: "Simulation failed", detail: String(err) });
  }
}

export async function handleSimulateStageReplyRequest(reqBody: {
  systemPrompt: string;
  transcript: Array<{ role: "contact" | "ai" | "system"; text: string }>;
  userMessage: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is missing");
  }

  const anthropicClient = new Anthropic({ apiKey });
  const { systemPrompt, transcript, userMessage } = reqBody;

  const messages = [
    ...transcript
      .filter((t) => t.role !== "system")
      .map((t) => ({
        role: t.role === "contact" ? ("user" as const) : ("assistant" as const),
        content: t.text,
      })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("\n");

  return { text };
}
