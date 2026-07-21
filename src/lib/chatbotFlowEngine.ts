import { Bot } from "../app/components/chats/ChatbotTab";
import { getLiveTeamMembers, SYSTEM_SEEDS } from "../app/context/FieldRegistryContext";
import { availableProcesses } from "../app/components/ui/ProcessStageSelect";
import { TestChatTurn } from "./chatbotTestReply";
import { ButtonAction } from "./chatbotTypes";

export interface FetchedOption {
  id: string;
  label: string;      // what's shown to the user (e.g. Dr. Rao, Mon at 9:00 AM)
  value: string;       // what gets saved to the mapped field
}

// Extended with context fields to resolve upstream fetch outputs and prior responses
export interface FlowExecutionContext {
  fetchedOptions?: FetchedOption[];
  history?: TestChatTurn[];
}

export interface FlowStepResult {
  nodeId: string;
  messageText: string;
  buttons?: { label: string; nextNodeId: string | null; actionType?: ButtonAction["actionType"]; actionValue?: string }[]; // null = no outgoing connection configured yet
  awaitingInput: boolean; // true if this node expects free-text (Open Question) rather than a button tap
  isEntryPoint?: boolean;
  saveResponseField?: string;
  fetchedOptions?: FetchedOption[]; // Output slot data feed passed to next step
  chatbotHandoff?: { targetBotId: string }; // Set when this node hands off to another bot
  assignHuman?: { personId: string };       // Set when a humanHandoff "yes" fires
  delayMs?: number;                         // Set by timeDelay node, actual ms to wait
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function getDelayMs(duration: number, unit: string): number {
  const d = Math.max(1, Math.floor(duration));
  if (unit === "Second") return d * 1000;
  if (unit === "Hour")   return d * 3600 * 1000;
  if (unit === "Day")    return d * 86400 * 1000;
  return d * 60 * 1000; // default: Minute
}

export function getLiveServices(): FetchedOption[] {
  try {
    const raw = sessionStorage.getItem("services");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any, idx: number) => ({
          id: String(s.id || idx + 1),
          label: s.name || s.label,
          value: s.name || s.value
        }));
      }
    }
  } catch {}

  return [
    { id: "1", label: "Initial Consultation", value: "Initial Consultation" },
    { id: "2", label: "Follow-up Visit", value: "Follow-up Visit" },
    { id: "3", label: "Dental Cleaning", value: "Dental Cleaning" },
    { id: "4", label: "X-Ray Imaging", value: "X-Ray Imaging" }
  ];
}

export function mockAvailabilitySlots(providerName: string): FetchedOption[] {
  const nameHash = providerName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const times = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];
  
  const slots: FetchedOption[] = [];
  const count = 3 + (nameHash % 3); // 3, 4, or 5 slots
  for (let i = 0; i < count; i++) {
    const day = days[(nameHash + i) % days.length];
    const time = times[(nameHash * (i + 1)) % times.length];
    const slotText = `${day} at ${time}`;
    slots.push({
      id: `slot-${i}-${nameHash}`,
      label: slotText,
      value: slotText
    });
  }
  return slots;
}

export function getSavedFieldValue(fieldKey: string, history: TestChatTurn[], bot: Bot): string {
  if (!history) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === "user" && turn.nodeId) {
      const node = bot.flow?.nodes.find(n => n.id === turn.nodeId);
      if (node && node.type === "question" && node.data?.saveResponseField === fieldKey) {
        return turn.text;
      }
    }
  }
  return "";
}

export function resolveProviderName(bot: Bot, history: TestChatTurn[]): string {
  if (!history || !bot?.flow?.nodes) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === "user" && turn.nodeId) {
      const node = bot.flow.nodes.find(n => n.id === turn.nodeId);
      if (node && node.type === "question") {
        if (node.data?.optionsSource?.module === "teamMembers" || node.data?.saveResponseField === "client.responsible") {
          return turn.text;
        }
      }
    }
  }
  return getSavedFieldValue("client.responsible", history, bot);
}

export function resolveDynamicOptions(moduleOrKey: string): FetchedOption[] {
  if (moduleOrKey === "teamMembers") {
    return getLiveTeamMembers().map(m => ({ id: String(m.id), label: m.label, value: m.value }));
  }
  if (moduleOrKey === "services") {
    return getLiveServices();
  }
  if (moduleOrKey === "processes") {
    return availableProcesses.map((p, i) => ({ id: String(i + 1), label: p, value: p }));
  }
  if (moduleOrKey.includes(".")) {
    const [moduleName, key] = moduleOrKey.split(".");
    // Check sessionStorage first (for custom fields)
    try {
      const saved = sessionStorage.getItem("fieldRegistry_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        const moduleFields = parsed[moduleName] || [];
        const field = moduleFields.find((f: any) => f.key === key);
        if (field && field.options) {
          return field.options.map((o: any) => ({ id: String(o.id), label: o.label, value: o.value }));
        }
      }
    } catch {}

    // Check system seeds
    const seeds = (SYSTEM_SEEDS as any)[moduleName] || [];
    const seedField = seeds.find((f: any) => f.key === key);
    if (seedField && seedField.options) {
      return seedField.options.map((o: any) => ({ id: String(o.id), label: o.label, value: o.value }));
    }
    // Backward compatibility for team member selectors
    if (key === "responsible" || key === "provider") {
      return getLiveTeamMembers().map(m => ({ id: String(m.id), label: m.label, value: m.value }));
    }
  }
  return [];
}

/**
 * Executes the Entry Point node. Called exactly once, when the test/real conversation
 * starts (Outbound) or receives its first message (Inbound).
 * Returns the FlowStepResult of the first connected node.
 */
export function executeEntryRouter(bot: Bot, ctx?: FlowExecutionContext): FlowStepResult | null {
  const entryNode = bot.flow?.nodes.find(n => n.type === "entryRouter");
  if (!entryNode) return null;

  const nextId = entryNode.connections?.[0]?.toNodeId ?? null;
  if (!nextId) {
    return {
      nodeId: entryNode.id,
      messageText: "[Entry point has no outgoing connections]",
      awaitingInput: false,
      isEntryPoint: true
    };
  }

  const result = executeFlowNode(bot, nextId, ctx);
  if (result) {
    return {
      ...result,
      isEntryPoint: true
    };
  }
  return null;
}

/**
 * Executes any non-entry node given its id — Send a Message, Ask a Question, Send a Template,
 * Set a Condition, Human Handoff, Time Delay, etc.
 * Returns what the bot says/asks next, and the outgoing options.
 */
export function executeFlowNode(bot: Bot, nodeId: string, ctx?: FlowExecutionContext): FlowStepResult | null {
  const node = bot.flow?.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  switch (node.type) {
    case "connectChatbot": {
      const targetBotId = node.data?.targetBotId || "";
      let targetBotName = "Unknown Bot";
      try {
        const raw = localStorage.getItem("chatbotBots");
        if (raw) {
          const all = JSON.parse(raw) as Bot[];
          const found = all.find(b => b.id === targetBotId);
          if (found) targetBotName = found.name;
        }
      } catch {}
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Hand off conversation to '${targetBotName}']`,
        awaitingInput: false,
        chatbotHandoff: { targetBotId }
      };
    }

    case "humanHandoff": {
      // Ask the handoff question with Yes/No buttons
      const questionText = node.data?.handoffQuestionText || "Would you like to speak with a human agent?";
      const yesPersonId = node.data?.yesPersonId || "";
      const noResponse = node.data?.noResponse;

      return {
        nodeId: node.id,
        messageText: questionText,
        awaitingInput: false,
        buttons: [
          {
            label: "Yes",
            nextNodeId: null, // Handled by handoffYes result — caller sees assignHuman
            actionType: "quick_reply" as const,
            // We encode the personId and "yes" in a special way that BotTestChatPanel can detect
          },
          {
            label: "No",
            nextNodeId: null,
            actionType: "quick_reply" as const,
          }
        ],
        // Also expose the branch data so the test panel can route to the right outcome
        assignHuman: yesPersonId ? { personId: yesPersonId } : undefined,
        // Store noResponse in messageText auxiliary via a JSON side-channel:
        // The panel checks btn.label === "Yes" / "No" when nodeType is humanHandoff
        // We'll handle this in BotTestChatPanel directly by inspecting the node type
      };
    }

    case "message":
      return {
        nodeId: node.id,
        messageText: node.data?.text ?? "",
        buttons: undefined,
        awaitingInput: false,
      };

    case "template":
      return {
        nodeId: node.id,
        messageText: `[Would send template: ${node.data?.templateId ?? "Unnamed template"}]`,
        awaitingInput: false,
      };

    case "question": {
      let choices: FetchedOption[] = [];
      const mode = node.data?.optionsSource?.mode ?? "static";
      const moduleKey = node.data?.optionsSource?.module;

      if (mode === "available") {
        if (moduleKey === "providerAvailability") {
          // Provider Availability: real-time slots, resolved per provider at conversation time
          const providerName = resolveProviderName(bot, ctx?.history || []) || "Sarah Jenkins";
          choices = mockAvailabilitySlots(providerName);
        } else {
          // Available: fixed registry (team members, services, processes, custom field options)
          choices = resolveDynamicOptions(moduleKey || "teamMembers");
        }
      } else {
        // Static: admin-typed ButtonAction[] (new) or plain string[] (legacy)
        const rawButtons: Array<ButtonAction | string> = node.data?.questionType === "buttons"
          ? (node.data?.buttons || [])
          : (node.data?.listItems || []);

        choices = rawButtons.map((item, i) => {
          if (typeof item === "string") {
            return { id: String(i), label: item || `Choice ${i + 1}`, value: item };
          }
          // ButtonAction
          return { id: String(i), label: item.label || `Button ${i + 1}`, value: item.label };
        });
      }

      if (node.data?.questionType === "open" || !node.data?.questionType) {
        return {
          nodeId: node.id,
          messageText: node.data?.text ?? "Please enter your response:",
          awaitingInput: true,
          saveResponseField: node.data?.saveResponseField,
        };
      }

      // Provider Availability: all slots share a single "any" outgoing connection
      if (mode === "available" && moduleKey === "providerAvailability") {
        const nextNodeIdForAny = node.connections?.find(c => c.fromPort === "any" || !c.fromPort)?.toNodeId ?? null;
        return {
          nodeId: node.id,
          messageText: node.data?.text ?? "Please choose an available slot:",
          buttons: choices.map((opt: FetchedOption) => ({
            label: opt.label,
            nextNodeId: nextNodeIdForAny,
            actionType: "quick_reply" as const,
          })),
          awaitingInput: false,
          saveResponseField: node.data?.saveResponseField,
          fetchedOptions: choices
        };
      }

      // Static and standard Available modes: per-choice connections via choice-N ports
      // For ButtonAction types (call/url/email), treat as terminal (nextNodeId = null)
      const rawButtonsForResult: Array<ButtonAction | string> = node.data?.questionType === "buttons"
        ? (node.data?.buttons || [])
        : (node.data?.listItems || []);

      return {
        nodeId: node.id,
        messageText: node.data?.text ?? "Please choose an option:",
        buttons: choices.map((opt: FetchedOption, i: number) => {
          const rawItem = rawButtonsForResult[i];
          const actionType: ButtonAction["actionType"] =
            typeof rawItem === "object" && rawItem.actionType ? rawItem.actionType : "quick_reply";
          const actionValue: string =
            typeof rawItem === "object" && rawItem.value ? rawItem.value : "";

          // Non-quick_reply buttons are terminal (call/url/email open externally)
          const isTerminal = actionType !== "quick_reply";
          const nextNodeId = isTerminal
            ? null
            : (node.connections?.find(c => c.fromPort === `choice-${i}`)?.toNodeId
               ?? node.connections?.[i]?.toNodeId
               ?? null);

          return {
            label: opt.label,
            nextNodeId,
            actionType,
            actionValue: isTerminal ? actionValue : undefined,
          };
        }),
        awaitingInput: false,
        saveResponseField: node.data?.saveResponseField,
      };
    }

    case "condition":
      return {
        nodeId: node.id,
        messageText: `[Condition node reached - Test Mode can't evaluate live variables. Configured branches: ${
          (node.data?.conditions ?? []).map((c: any) => `${c.variable} ${c.operator} ${c.value}`).join(", ") || "none set"
        }]`,
        buttons: (node.connections || []).map((c, i) => {
          let label = `Branch ${i + 1} →`;
          if (c.fromPort === "true") label = "True / Yes →";
          if (c.fromPort === "false") label = "False / No →";
          return { label, nextNodeId: c.toNodeId, actionType: "quick_reply" as const };
        }),
        awaitingInput: false,
      };

    case "updateChatStatus":
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Update chat status to ${node.data?.status || "Open"}]`,
        awaitingInput: false,
      };

    case "setTags":
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Set tags - ${(node.data?.tags || []).join(", ") || "none"}]`,
        awaitingInput: false,
      };

    case "timeDelay": {
      const duration = node.data?.duration || 1;
      const unit = node.data?.unit || "Minute";
      const delayMs = getDelayMs(duration, unit);
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Wait for ${duration} ${unit}(s)]`,
        awaitingInput: false,
        delayMs,
      };
    }

    case "assignHuman": {
      const personId = node.data?.employeeId || "";
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Assign conversation to team member${personId ? ` (id: ${personId})` : ""}]`,
        awaitingInput: false,
        assignHuman: personId ? { personId } : undefined,
      };
    }

    case "fieldUpdate": {
      const fieldKey = node.data?.fieldKey || "—";
      const value = node.data?.value || "—";
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Update field "${fieldKey}" → "${value}"]`,
        awaitingInput: false,
      };
    }

    default:
      return {
        nodeId: node.id,
        messageText: `[${node.type} node - not yet simulated in Test Mode]`,
        awaitingInput: false,
      };
  }
}

/**
 * Fallback search in bot's knowledge base.
 */
export function answerFromKnowledgeBase(bot: Bot, question: string): string | null {
  const q = question.toLowerCase();
  const textSources = (bot.knowledgeBases ?? []).flatMap(kb => (kb.sources ?? []).filter((s: any) => s.type === "text"));
  const hit = textSources.find((s: any) =>
    q.split(/\s+/).some(word => word.length > 3 && s.title?.toLowerCase().includes(word))
  );
  return hit ? (hit as any).content : null;
}
