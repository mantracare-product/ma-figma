import { Bot } from "../app/components/chats/ChatbotTab";
import { getSavedFieldValue, resolveProviderName } from "./chatbotFlowEngine";

export interface TestChatTurn {
  role: "user" | "bot" | "system";
  text: string;
  matchedReason?: string;
  isMockGenerated?: boolean;
  buttons?: { label: string; nextNodeId: string | null }[];
  nodeId?: string; // tracks which node was active during this turn
}


export interface TestReplyResult {
  text: string;
  matchedEscalation?: { keyword: string; personId: string };
  matchedHandoff?: boolean;
  matchedTemplateId?: string;
  isMockGenerated?: boolean;
  matchedKnowledgeBase?: boolean;
  matchedReason?: string;
}

// TODO(backend): replace this whole function body with a real call to the
// production reply-generation endpoint, passing the same `bot` draft object.
// Signature should NOT change — Test Mode and any future production caller
// both depend on this exact input/output shape.
export async function generateTestBotReply(
  bot: Bot,
  userMessage: string,
  history: TestChatTurn[],
  opts: { withinBusinessHours: boolean; orgBusinessHoursConfigured?: boolean }
): Promise<TestReplyResult> {
  const lower = userMessage.toLowerCase();

  // 1. Priority assignment rules (highest precedence — human assignment signal)
  for (const rule of bot.escalationRules) {
    if (!rule.enabled) continue;
    const kw = rule.keyword.toLowerCase();
    const isMatch =
      rule.matchType === "exact" ? lower === kw :
      rule.matchType === "starts_with" ? lower.startsWith(kw) :
      lower.includes(kw); // default "contains"
    if (isMatch) {
      return {
        text: "",
        matchedEscalation: { keyword: rule.keyword, personId: rule.responsiblePersonId },
        matchedReason: `Matched priority assignment rule '${rule.keyword}'`
      };
    }
  }

  // 2. Template Rules (second precedence — automated template reply)
  for (const rule of bot.templateRules) {
    if (!rule.enabled) continue;
    const kw = rule.triggerKeyword.toLowerCase();
    const isMatch =
      rule.matchType === "exact" ? lower === kw :
      rule.matchType === "starts_with" ? lower.startsWith(kw) :
      lower.includes(kw);
    if (isMatch) {
      return {
        text: "",
        matchedTemplateId: rule.templateId,
        matchedReason: `Matched template rule '${rule.triggerKeyword}'`
      };
    }
  }

  // 3. Assign to Human keyword
  if (bot.handoffEnabled && bot.handoffKeyword && lower.includes(bot.handoffKeyword.toLowerCase())) {
    return {
      text: "",
      matchedHandoff: true,
      matchedReason: `Matched handoff keyword '${bot.handoffKeyword}'`
    };
  }

  // 4. Business hours gate
  if (bot.businessHoursEnabled) {
    const isInherit = (bot.businessHoursMode ?? "inherit") === "inherit";
    const checkOffline = isInherit ? opts.orgBusinessHoursConfigured : true;
    if (checkOffline && !opts.withinBusinessHours) {
      return {
        text: bot.offlineMessage || "We're currently offline.",
        matchedReason: `Offline response via Business Hours (${isInherit ? "Inherited" : "Custom"})`
      };
    }
  }

  // 5. Mock "AI" answer — naive keyword match against active knowledge base text sources
  const textSources = bot.knowledgeBases.flatMap(kb =>
    kb.sources.filter(s => s.type === "text")
  );
  const hit = textSources.find(s =>
    lower.split(/\s+/).some(word => word.length > 3 && (s as any).title?.toLowerCase().includes(word))
  );
  if (hit) {
    return {
      text: (hit as any).content,
      matchedKnowledgeBase: true,
      matchedReason: `Matched Knowledge Base entry '${(hit as any).title}'`
    };
  }

  // 6. AI Fallback (bypasses rules)
  if (!bot.aiObjective.trim()) {
    return {
      text: bot.fallbackMessage || "I'm not sure how to help with that yet.",
      isMockGenerated: true,
      matchedReason: "AI fallback response"
    };
  }
  
  return {
    text: resolveTestVariables(bot.fallbackMessage || "Thanks for your message — a real reply would be generated here."),
    isMockGenerated: true,
    matchedReason: "AI response generated from bot script"
  };
}

export function resolveTestVariables(text: string, history: TestChatTurn[] = [], bot?: Bot): string {
  if (!text) return "";
  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const varName = expression.trim();
    
    // 1. Resolve teamMember fields
    if (varName.startsWith("teamMember.") && bot) {
      const key = varName.split(".")[1];
      const selectedProvider = resolveProviderName(bot, history) || "Dr. Sarah Jenkins";
      if (key === "name") return selectedProvider;
      if (key === "email") return `${selectedProvider.toLowerCase().replace(/[^a-z0-9]/g, "")}@mantracare.org`;
      if (key === "phone") return "+1 (555) 456-7890";
      if (key === "role") return "Specialist";
      if (key === "assigned_service") return "Initial Consultation";
      if (key === "next_available_slot") return "Thu at 3:30 PM";
    }
    
    // 2. Resolve other fields from history
    if (bot) {
      const val = getSavedFieldValue(varName, history, bot);
      if (val) return val;
    }
    
    // Fallback
    return "there";
  });
}
