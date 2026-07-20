import { Bot } from "../app/components/chats/ChatbotTab";

export interface FlowExecutionContext {
  simulatedIdentity: "new_contact" | "returning_with_process" | "returning_no_process";
  // For "returning_with_process" only — which process/stage to pretend the test contact is already in:
  simulatedProcessName?: string;
  simulatedStageName?: string;
}

export interface FlowStepResult {
  nodeId: string;
  messageText: string;
  buttons?: { label: string; nextNodeId: string | null }[]; // null = no outgoing connection configured yet
  awaitingInput: boolean; // true if this node expects free-text (Open Question) rather than a button tap
  isEntryPoint?: boolean;
}

const MOCK_PROCESSES_FOR_ENTRY_ROUTER = [
  // Kept in sync manually with Process.tsx's seed data for now — do not let this drift silently;
  // if Process.tsx's seed processes change, update this list too.
  { name: "Patient Intake", firstStageName: "Initial Contact" },
  { name: "Follow-up Calls", firstStageName: "Post-Visit Check" },
];

/**
 * Executes the Entry Point node. Called exactly once, when the test/real conversation
 * receives its first inbound message.
 */
export function executeEntryRouter(bot: Bot, ctx: FlowExecutionContext): FlowStepResult {
  const entryNode = bot.flow?.nodes.find(n => n.type === "entryRouter");
  const excludedProcesses: string[] = entryNode?.data?.excludedProcesses ?? [];
  const showReturningStage: boolean = entryNode?.data?.showReturningStage ?? true;

  const newContactPrompt = entryNode?.data?.newContactPrompt ?? "Hi! How can I help you today?";
  const returningContactPromptTemplate = entryNode?.data?.returningContactPrompt ?? 'Welcome back! You\'re currently in "{{processName}}" — {{stageName}}.';
  const processButtonLabels: Record<string, string> = entryNode?.data?.processButtonLabels ?? {};

  if (ctx.simulatedIdentity === "returning_with_process" && showReturningStage) {
    const formattedReturningPrompt = returningContactPromptTemplate
      .replace("{{processName}}", ctx.simulatedProcessName ?? "")
      .replace("{{stageName}}", ctx.simulatedStageName ?? "");

    return {
      nodeId: entryNode?.id ?? "entry-router",
      isEntryPoint: true,
      messageText: formattedReturningPrompt,
      buttons: [
        { label: `Continue with ${ctx.simulatedProcessName}`, nextNodeId: entryNode?.connections?.[0]?.toNodeId ?? null },
        { label: "See other options", nextNodeId: "__process_picker__" }, // sentinel, resolved by panel
      ],
      awaitingInput: false,
    };
  }

  // New contact, or returning client with no active process, or "See other options" was tapped —
  // show the process picker.
  const eligible = MOCK_PROCESSES_FOR_ENTRY_ROUTER.filter(p => !excludedProcesses.includes(p.name));
  return {
    nodeId: entryNode?.id ?? "entry-router",
    isEntryPoint: true,
    messageText: newContactPrompt,
    buttons: eligible.map(p => ({
      label: processButtonLabels[p.name] ?? p.name,
      nextNodeId: `__enroll__${p.name}` // sentinel, resolved by caller
    })),
    awaitingInput: false,
  };
}

/**
 * Executes any non-entry node given its id — Send a Message, Ask a Question, Send a Template,
 * Set a Condition. Returns what the bot says/asks next, and the outgoing options if the node branches.
 */
export function executeFlowNode(bot: Bot, nodeId: string): FlowStepResult | null {
  const node = bot.flow?.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  switch (node.type) {
    case "message":
      return {
        nodeId: node.id,
        messageText: node.data?.text ?? "",
        buttons: undefined, // Message nodes are single-output; branching only happens on question/condition nodes
        awaitingInput: false,
      };
    case "template":
      return {
        nodeId: node.id,
        messageText: `[Would send template: ${node.data?.templateId ?? "Unnamed template"}]`,
        awaitingInput: false,
      };
    case "question":
      if (node.data?.questionType === "open" || !node.data?.questionType) {
        return {
          nodeId: node.id,
          messageText: node.data?.text ?? "Please enter your response:",
          awaitingInput: true
        };
      }
      // Buttons or List type — both render as tappable options in Test Mode
      const choices = node.data?.questionType === "buttons"
        ? (node.data?.buttons ?? [])
        : (node.data?.listItems ?? []);
      return {
        nodeId: node.id,
        messageText: node.data?.text ?? "Please choose an option:",
        buttons: choices.map((opt: string, i: number) => ({
          label: opt || `Choice ${i + 1}`,
          nextNodeId: node.connections?.[i]?.toNodeId ?? null,
        })),
        awaitingInput: false,
      };
    case "condition":
      // Test Mode can't evaluate real condition variables (no live client/call data) —
      // surface this honestly instead of guessing a branch.
      return {
        nodeId: node.id,
        messageText: `[Condition node reached - Test Mode can't evaluate live variables. Configured branches: ${
          (node.data?.conditions ?? []).map((c: any) => `${c.variable} ${c.operator} ${c.value}`).join(", ") || "none set"
        }]`,
        buttons: (node.connections || []).map((c, i) => {
          let label = `Branch ${i + 1} →`;
          if (c.fromPort === "true") label = "True / Yes →";
          if (c.fromPort === "false") label = "False / No →";
          return { label, nextNodeId: c.toNodeId };
        }),
        awaitingInput: false,
      };
    case "assignHuman":
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Assign to human - employee ID ${node.data?.employeeId || "unassigned"}]`,
        awaitingInput: false,
      };
    case "assignTeam":
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Assign team - ${node.data?.teamName || "unassigned"}]`,
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
    case "timeDelay":
      return {
        nodeId: node.id,
        messageText: `[Flow Action: Wait for ${node.data?.duration || 1} ${node.data?.unit || "Minute"}(s)]`,
        awaitingInput: false,
      };
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
