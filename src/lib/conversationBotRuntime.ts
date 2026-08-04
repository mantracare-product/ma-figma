import { Bot, getEffectiveFallbackResponse } from "../app/components/chats/ChatbotTab";
import { Campaign, CampaignNode, WhatsappTemplate } from "../app/pages/Chats";
import {
  executeEntryRouter,
  executeFlowNode,
  answerFromKnowledgeBase,
  FlowStepResult,
  getDelayMs,
} from "./chatbotFlowEngine";
import { resolveTestVariables, TestChatTurn } from "./chatbotTestReply";

export interface RuntimeMessage {
  text: string;
  sender: "contact" | "me";
  origin?: "human" | "bot" | "campaign" | "template" | "system";
  buttons?: Array<{ label: string; nextNodeId?: string | null; actionType?: string; actionValue?: string }>;
  header?: {
    type?: "none" | "text" | "image" | "video" | "document";
    text?: string;
    mediaUrl?: string;
    fileName?: string;
  };
}

export interface ConversationRuntimeState {
  currentNodeId: string | null;
  awaitingFreeText: boolean;
  pendingHandoffNodeId: string | null;
}

export interface ConversationShape {
  id: string;
  contactName: string;
  phoneNumber: string;
  channel: "whatsapp" | "sms" | "website";
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "open" | "resolved";
  messages: Array<{
    id: string;
    text: string;
    timestamp: string;
    sender: "contact" | "me";
    status?: "sent" | "delivered" | "read";
    origin?: "human" | "bot" | "campaign" | "template" | "system";
    buttons?: Array<{ label: string; nextNodeId?: string | null; actionType?: string; actionValue?: string }>;
    header?: {
      type?: "none" | "text" | "image" | "video" | "document";
      text?: string;
      mediaUrl?: string;
      fileName?: string;
    };
  }>;
  botStatus?: "active" | "paused" | "off";
  assignedPersonId?: string;
  assignedBotId?: string;
  botRuntime?: ConversationRuntimeState;
  campaignEnrollments?: Array<{
    campaignId: string;
    currentNodeIndex: number;
    enrolledAt: string;
    status: "active" | "completed" | "paused";
    nextRunAt?: string;
  }>;
}

export interface AdvanceResult {
  newMessages: RuntimeMessage[];
  botRuntimePatch?: ConversationRuntimeState;
  assignedPersonIdPatch?: string;
  botStatusPatch?: ConversationShape["botStatus"];
  assignedBotIdPatch?: string;
  delayMs?: number;
  /** Messages to append after the delay has elapsed (pre-computed so the drawer just waits then shows them) */
  postDelayMessages?: RuntimeMessage[];
  postDelayBotRuntimePatch?: ConversationRuntimeState;
}

/**
 * Shared helper to convert a WhatsappTemplate into a RuntimeMessage (or Message)
 * preserving text and template buttons.
 */
export function buildTemplateMessage(
  template: WhatsappTemplate,
  resolvedText?: string,
  extra?: { id?: string; sender?: "contact" | "me"; origin?: "human" | "bot" | "campaign" | "template" | "system" }
): RuntimeMessage {
  const buttons = template.buttons?.length
    ? template.buttons.map((b) => ({
        label: b.label,
        nextNodeId: null,
        actionType: (b.type as any) || "quick_reply",
        actionValue: b.value || "",
      }))
    : undefined;

  const header = (template.headerType && template.headerType !== "none") || template.header?.type
    ? {
        type: template.headerType || template.header?.type || "none",
        text: template.headerText || template.header?.content || "",
        mediaUrl: template.headerMediaUrl || "",
        fileName: template.headerFileName || "",
      }
    : undefined;

  return {
    text: resolvedText ?? template.bodyText,
    sender: extra?.sender || "me",
    origin: extra?.origin || "template",
    buttons,
    header,
  };
}

/**
 * Converts a Conversation's message history into the TestChatTurn[] shape
 * expected by chatbotFlowEngine.
 */
export function conversationToTurns(conversation: ConversationShape): TestChatTurn[] {
  return (conversation.messages || []).map((m) => ({
    role: m.sender === "contact" ? "user" : m.origin === "system" ? "system" : "bot",
    text: m.text,
  }));
}

/**
 * Executes a bot flow step or fallback when a contact message is received.
 *
 * @param nextNodeId  Provide when a flow button was tapped — navigates directly to that node
 *                    instead of re-running the entry router.
 * @param actionType  "call" | "url" | "email" for terminal buttons — shows a system chip.
 * @param actionValue The phone/URL/email for terminal buttons.
 */
export function advanceBotForInboundMessage(
  conversation: ConversationShape,
  bot: Bot | undefined,
  incomingText: string,
  nextNodeId?: string | null,
  actionType?: string,
  actionValue?: string,
): AdvanceResult {
  // Rule 1: If assigned to a human, bot does NOT respond
  if (conversation.assignedPersonId) {
    let humanName = "team member";
    try {
      const rawEmployees = localStorage.getItem("teamMembers");
      if (rawEmployees) {
        const emp = JSON.parse(rawEmployees).find((e: any) => e.id === conversation.assignedPersonId);
        if (emp?.name) humanName = emp.name;
      }
    } catch {}
    return {
      newMessages: [
        {
          text: `🔕 Bot inactive — assigned to ${humanName}`,
          sender: "me",
          origin: "system",
        },
      ],
    };
  }

  // Rule 2: If bot is paused or off, or no bot assigned
  if (conversation.botStatus !== "active") {
    return {
      newMessages: [
        {
          text: "🔕 Bot paused",
          sender: "me",
          origin: "system",
        },
      ],
    };
  }

  if (!bot) {
    return {
      newMessages: [
        {
          text: "🔕 No chatbot assigned to this conversation",
          sender: "me",
          origin: "system",
        },
      ],
    };
  }

  const turns = conversationToTurns(conversation);
  // Add incoming contact turn
  turns.push({ role: "user", text: incomingText });

  const runtime = conversation.botRuntime || {
    currentNodeId: null,
    awaitingFreeText: false,
    pendingHandoffNodeId: null,
  };

  // ── TERMINAL BUTTON ACTION (call / url / email) ──────────────────────
  if (actionType && actionType !== "quick_reply") {
    const labels: Record<string, string> = {
      call: `📞 Calling ${actionValue || "…"}`,
      url: `🌐 Opening ${actionValue || "…"}`,
      email: `✉️ Emailing ${actionValue || "…"}`,
    };
    return {
      newMessages: [{ text: labels[actionType] ?? `[${actionType}: ${actionValue}]`, sender: "me", origin: "system" }],
      botRuntimePatch: { currentNodeId: null, awaitingFreeText: false, pendingHandoffNodeId: null },
    };
  }

  // ── HUMAN HANDOFF YES/NO BRANCH ──────────────────────────────────────
  if (runtime.pendingHandoffNodeId && nextNodeId === undefined) {
    const handoffNode = bot.flow?.nodes.find(n => n.id === runtime.pendingHandoffNodeId);
    if (handoffNode?.type === "humanHandoff") {
      if (incomingText.trim().toLowerCase() === "yes") {
        const personId = handoffNode.data?.yesPersonId || "";
        let personName = "team member";
        try {
          const rawEmployees = localStorage.getItem("teamMembers");
          if (rawEmployees) {
            const emp = JSON.parse(rawEmployees).find((e: any) => e.id === personId);
            if (emp?.name) personName = emp.name;
          }
        } catch {}
        return {
          newMessages: [{ text: `✅ Conversation assigned to ${personName}`, sender: "me", origin: "system" }],
          assignedPersonIdPatch: personId || "unassigned",
          botStatusPatch: "paused",
          botRuntimePatch: { currentNodeId: null, awaitingFreeText: false, pendingHandoffNodeId: null },
        };
      } else {
        // No branch — execute noResponse config
        const noResponse = handoffNode.data?.noResponse;
        if (noResponse?.type === "message") {
          return {
            newMessages: [{
              text: resolveTestVariables(noResponse.text || "Okay, let's continue.", turns, bot),
              sender: "me",
              origin: "bot",
            }],
            botRuntimePatch: { currentNodeId: null, awaitingFreeText: false, pendingHandoffNodeId: null },
          };
        }
        return {
          newMessages: [{ text: "Alright, let's continue then.", sender: "me", origin: "bot" }],
          botRuntimePatch: { currentNodeId: null, awaitingFreeText: false, pendingHandoffNodeId: null },
        };
      }
    }
  }

  let stepResult: FlowStepResult | null = null;

  // ── BUTTON TAP: navigate directly to the resolved node ───────────────
  if (nextNodeId !== undefined) {
    if (nextNodeId === null) {
      return {
        newMessages: [{ text: "⚠️ This button isn't connected to a next step yet — add a node after it on the canvas.", sender: "me", origin: "system" }],
      };
    }
    stepResult = executeFlowNode(bot, nextNodeId, { history: turns });
  }
  // ── FREE TEXT at open-question node: advance via the node's first connection ──
  else if (runtime.currentNodeId && runtime.awaitingFreeText) {
    const node = bot.flow?.nodes.find(n => n.id === runtime.currentNodeId);
    const nextId = node?.connections?.[0]?.toNodeId ?? null;
    if (nextId) {
      stepResult = executeFlowNode(bot, nextId, { history: turns });
    }
  }
  // ── NO ACTIVE POSITION: run entry router (handles the very first inbound message) ──
  else if (!runtime.currentNodeId) {
    stepResult = executeEntryRouter(bot, { history: turns });
  }
  // else: has a currentNodeId but not awaitingFreeText and no nextNodeId — fall through to KB/fallback

  if (stepResult) {
    // Handle time-delay nodes: pre-compute the post-delay step so the drawer
    // can wait `delayMs` ms and then show the next result without re-calling this function.
    if (stepResult.delayMs) {
      const delayNode = bot.flow?.nodes.find(n => n.id === stepResult!.nodeId);
      const afterDelayNextId = delayNode?.connections?.[0]?.toNodeId ?? null;
      const baseResult: AdvanceResult = {
        newMessages: [{
          text: `⏱ Delay: ${delayNode?.data?.duration ?? 1} ${delayNode?.data?.unit ?? "Minute"}(s) — continuing automatically…`,
          sender: "me",
          origin: "system",
        }],
        delayMs: stepResult.delayMs,
        botRuntimePatch: {
          currentNodeId: stepResult.nodeId,
          awaitingFreeText: false,
          pendingHandoffNodeId: null,
        },
      };
      if (afterDelayNextId) {
        const nextStep = executeFlowNode(bot, afterDelayNextId, { history: turns });
        if (nextStep) {
          const nextAdvance = processFlowStepResult(nextStep, bot, turns);
          return {
            ...baseResult,
            postDelayMessages: nextAdvance.newMessages,
            postDelayBotRuntimePatch: nextAdvance.botRuntimePatch,
            assignedPersonIdPatch: nextAdvance.assignedPersonIdPatch,
            botStatusPatch: nextAdvance.botStatusPatch,
            assignedBotIdPatch: nextAdvance.assignedBotIdPatch,
          };
        }
      }
      return baseResult;
    }
    return processFlowStepResult(stepResult, bot, turns);
  }

  // Fallback 1: Knowledge base answer
  const kbHit = answerFromKnowledgeBase(bot, incomingText);
  if (kbHit) {
    return {
      newMessages: [
        {
          text: resolveTestVariables(kbHit, turns, bot),
          sender: "me",
          origin: "bot",
        },
      ],
      botRuntimePatch: {
        currentNodeId: null,
        awaitingFreeText: false,
        pendingHandoffNodeId: null,
      },
    };
  }

  // Fallback 2: Bot fallback response
  const fallback = getEffectiveFallbackResponse(bot);
  const fallbackText = resolveTestVariables(
    fallback.text || "I'm not sure how to help with that. Connecting you to our team...",
    turns,
    bot
  );

  return {
    newMessages: [
      {
        text: fallbackText,
        sender: "me",
        origin: "bot",
      },
    ],
    botRuntimePatch: {
      currentNodeId: null,
      awaitingFreeText: false,
      pendingHandoffNodeId: null,
    },
  };
}

/**
 * Runs the entry router immediately when a chatbot is assigned to a conversation.
 */
export function activateBotOnConversation(bot: Bot, conversation: ConversationShape): AdvanceResult {
  const turns = conversationToTurns(conversation);
  const entryResult = executeEntryRouter(bot, { history: turns });

  if (entryResult) {
    return processFlowStepResult(entryResult, bot, turns);
  }

  return {
    newMessages: [
      {
        text: resolveTestVariables(bot.greetingMessage || `Hello! I am ${bot.name}. How can I assist you today?`, turns, bot),
        sender: "me",
        origin: "bot",
      },
    ],
    botRuntimePatch: {
      currentNodeId: null,
      awaitingFreeText: false,
      pendingHandoffNodeId: null,
    },
  };
}

/**
 * Internal helper to process a FlowStepResult into AdvanceResult.
 */
function processFlowStepResult(result: FlowStepResult, bot: Bot, turns: TestChatTurn[]): AdvanceResult {
  const newMessages: RuntimeMessage[] = [];

  // Handle Handoff to another Bot
  if (result.chatbotHandoff?.targetBotId) {
    const targetBotId = result.chatbotHandoff.targetBotId;
    let targetBot: Bot | null = null;
    let targetBotName = "another bot";
    try {
      const raw = localStorage.getItem("chatbotBots");
      if (raw) {
        const sanitizeBot = (b: Bot): Bot => ({ ...b, channels: (b.channels || []).filter((c) => c !== "sms") });
        const all = (JSON.parse(raw) as Bot[]).map(sanitizeBot);
        const found = all.find((b) => b.id === targetBotId);
        if (found) {
          targetBot = found;
          targetBotName = found.name;
        }
      }
    } catch {}

    newMessages.push({
      text: `→ Handed off to "${targetBotName}"`,
      sender: "me",
      origin: "system",
    });

    if (targetBot) {
      const targetEntryResult = executeEntryRouter(targetBot, { history: turns });
      if (targetEntryResult) {
        newMessages.push({
          text: resolveTestVariables(targetEntryResult.messageText, turns, targetBot),
          sender: "me",
          origin: "bot",
          buttons: targetEntryResult.buttons,
        });
        return {
          newMessages,
          assignedBotIdPatch: targetBot.id,
          botRuntimePatch: {
            currentNodeId: targetEntryResult.nodeId,
            awaitingFreeText: targetEntryResult.awaitingInput,
            pendingHandoffNodeId: targetEntryResult.assignHuman !== undefined ? targetEntryResult.nodeId : null,
          },
        };
      }
    }

    return {
      newMessages,
      assignedBotIdPatch: targetBotId,
      botRuntimePatch: {
        currentNodeId: null,
        awaitingFreeText: false,
        pendingHandoffNodeId: null,
      },
    };
  }

  // Handle Assign Human node
  if (result.assignHuman !== undefined) {
    const personId = result.assignHuman.personId || "unassigned";
    let personName = "team member";
    try {
      const rawEmployees = localStorage.getItem("teamMembers");
      if (rawEmployees) {
        const emp = JSON.parse(rawEmployees).find((e: any) => e.id === personId);
        if (emp?.name) personName = emp.name;
      }
    } catch {}

    newMessages.push({
      text: resolveTestVariables(result.messageText, turns, bot),
      sender: "me",
      origin: "bot",
      buttons: result.buttons,
    });
    newMessages.push({
      text: `👤 Assigned conversation to ${personName}`,
      sender: "me",
      origin: "system",
    });

    return {
      newMessages,
      assignedPersonIdPatch: personId,
      botStatusPatch: "paused",
      botRuntimePatch: {
        currentNodeId: result.nodeId,
        awaitingFreeText: result.awaitingInput,
        pendingHandoffNodeId: result.nodeId,
      },
    };
  }

  // Normal Bot Step Output
  newMessages.push({
    text: resolveTestVariables(result.messageText, turns, bot),
    sender: "me",
    origin: "bot",
    buttons: result.buttons,
  });

  return {
    newMessages,
    delayMs: result.delayMs,
    botRuntimePatch: {
      currentNodeId: result.nodeId,
      awaitingFreeText: result.awaitingInput,
      pendingHandoffNodeId: null,
    },
  };
}

/**
 * Steps a conversation forward through a Campaign's nodes.
 */
export function advanceCampaignStep(
  conversation: ConversationShape,
  campaign: Campaign,
  currentIndex?: number
): {
  newMessages: RuntimeMessage[];
  enrollmentPatch: NonNullable<ConversationShape["campaignEnrollments"]>[number];
} {
  const nodes = campaign.nodes || [];
  const idx = currentIndex !== undefined ? currentIndex : 0;

  if (idx >= nodes.length) {
    return {
      newMessages: [
        {
          text: `📢 Campaign "${campaign.name}" completed.`,
          sender: "me",
          origin: "system",
        },
      ],
      enrollmentPatch: {
        campaignId: campaign.id,
        currentNodeIndex: idx,
        enrolledAt: new Date().toISOString(),
        status: "completed",
      },
    };
  }

  const node = nodes[idx];
  const newMessages: RuntimeMessage[] = [];

  if (node.type === "end") {
    return {
      newMessages: [
        {
          text: `📢 Campaign "${campaign.name}" completed.`,
          sender: "me",
          origin: "system",
        },
      ],
      enrollmentPatch: {
        campaignId: campaign.id,
        currentNodeIndex: idx,
        enrolledAt: new Date().toISOString(),
        status: "completed",
      },
    };
  }

  if (node.type === "message") {
    let msgText = node.content || `[Campaign step: ${node.label}]`;
    let msgButtons: RuntimeMessage["buttons"] = undefined;

    if (node.messageMode === "template" && node.templateIdentifier) {
      try {
        const rawTemplates = localStorage.getItem("whatsappGlobalTemplates");
        if (rawTemplates) {
          const templates = JSON.parse(rawTemplates) as WhatsappTemplate[];
          const tmpl = templates.find((t) => t.identifier === node.templateIdentifier || t.id === node.templateIdentifier);
          if (tmpl) {
            const tmplMsg = buildTemplateMessage(tmpl, resolveTestVariables(tmpl.bodyText || ""), { origin: "campaign" });
            msgText = tmplMsg.text;
            msgButtons = tmplMsg.buttons;
          }
        }
      } catch {}
    } else if (node.messageMode === "chatbot" && (node as any).chatbotId) {
      try {
        const rawBots = localStorage.getItem("chatbotBots");
        if (rawBots) {
          const sanitizeBot = (b: Bot): Bot => ({ ...b, channels: (b.channels || []).filter((c) => c !== "sms") });
          const bots = (JSON.parse(rawBots) as Bot[]).map(sanitizeBot);
          const targetBot = bots.find((b) => b.id === (node as any).chatbotId);
          if (targetBot) {
            const botAct = activateBotOnConversation(targetBot, conversation);
            newMessages.push(...botAct.newMessages);
            const nextIdx = idx + 1;
            return {
              newMessages,
              enrollmentPatch: {
                campaignId: campaign.id,
                currentNodeIndex: nextIdx,
                enrolledAt: new Date().toISOString(),
                status: nextIdx >= nodes.length ? "completed" : "active",
              },
            };
          }
        }
      } catch {}
    }

    newMessages.push({
      text: msgText,
      sender: "me",
      origin: "campaign",
      buttons: msgButtons,
    });

    // Check if next node is delay
    const nextIdx = idx + 1;
    if (nextIdx < nodes.length && nodes[nextIdx].type === "delay") {
      const delayNode = nodes[nextIdx];
      const delayVal = delayNode.delayValue || 1;
      const unit = delayNode.delayUnit || "minutes";
      const rawDelayMs = getDelayMs(delayVal, unit === "minutes" ? "Minute" : unit === "hours" ? "Hour" : "Day");
      const clampedDelayMs = Math.min(rawDelayMs, 3000); // 3s clamp for dev

      return {
        newMessages,
        enrollmentPatch: {
          campaignId: campaign.id,
          currentNodeIndex: nextIdx + 1,
          enrolledAt: new Date().toISOString(),
          status: "active",
          nextRunAt: new Date(Date.now() + clampedDelayMs).toISOString(),
        },
      };
    }

    return {
      newMessages,
      enrollmentPatch: {
        campaignId: campaign.id,
        currentNodeIndex: nextIdx,
        enrolledAt: new Date().toISOString(),
        status: nextIdx >= nodes.length ? "completed" : "active",
      },
    };
  }

  if (node.type === "delay") {
    const delayVal = node.delayValue || 1;
    const unit = node.delayUnit || "minutes";
    const rawDelayMs = getDelayMs(delayVal, unit === "minutes" ? "Minute" : unit === "hours" ? "Hour" : "Day");
    const clampedDelayMs = Math.min(rawDelayMs, 3000);

    return {
      newMessages: [],
      enrollmentPatch: {
        campaignId: campaign.id,
        currentNodeIndex: idx + 1,
        enrolledAt: new Date().toISOString(),
        status: "active",
        nextRunAt: new Date(Date.now() + clampedDelayMs).toISOString(),
      },
    };
  }

  // Default fallback for condition or unknown nodes
  return {
    newMessages: [
      {
        text: `[Campaign step: ${node.label}]`,
        sender: "me",
        origin: "campaign",
      },
    ],
    enrollmentPatch: {
      campaignId: campaign.id,
      currentNodeIndex: idx + 1,
      enrolledAt: new Date().toISOString(),
      status: idx + 1 >= nodes.length ? "completed" : "active",
    },
  };
}
