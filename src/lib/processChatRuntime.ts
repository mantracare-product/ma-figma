import type { WorkflowStep } from "../app/types/workflow";
import { getKnowledgeSourcesForStage } from "./useKnowledgeBase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatRuntimeState {
  currentStepId: string | null;
  awaitingFreeText: boolean;
  pendingHandoffStepId: string | null;
}

export interface ChatConversationShape {
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
    buttons?: Array<{
      label: string;
      nextStepId?: string | null;
      nextNodeId?: string | null;
      actionType?: string;
      actionValue?: string;
    }>;
    header?: {
      type?: "none" | "text" | "image" | "video" | "document";
      text?: string;
      mediaUrl?: string;
      fileName?: string;
    };
  }>;
  // Process-based fields (replace assignedBotId)
  processId?: string;
  stageId?: string;
  automationStatus?: "active" | "paused" | "off";
  assignedPersonId?: string;
  chatRuntime?: ChatRuntimeState;
  campaignEnrollments?: Array<{
    campaignId: string;
    currentNodeIndex: number;
    enrolledAt: string;
    status: "active" | "completed" | "paused";
    nextRunAt?: string;
  }>;
}

export interface StepExecResult {
  stepId: string;
  messageText: string;
  awaitingInput: boolean;
  buttons?: Array<{
    label: string;
    nextStepId: string | null;
    actionType?: string;
    actionValue?: string;
  }>;
  delayMs?: number;
  assignHuman?: { personId: string; askFirst: boolean; questionText?: string };
  stageMove?: { processId: string; stageId: string };
}

export interface ProcessAdvanceResult {
  newMessages: ChatConversationShape["messages"];
  runtimePatch?: ChatRuntimeState;
  assignedPersonIdPatch?: string;
  automationStatusPatch?: ChatConversationShape["automationStatus"];
  stageMovePatch?: { processId: string; stageId: string };
}

// ─── Variable Resolution ──────────────────────────────────────────────────────

export function resolveVars(
  text: string,
  history: Array<{ sender: string; text: string }>
): string {
  if (!text) return "";
  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const varName = expression.trim().toLowerCase();
    // Attempt to resolve from message history by looking for saved field values
    if (varName === "contact.name") {
      // Extract from the last "me" message that might contain it; or just return placeholder
      return "[Contact Name]";
    }
    // Other variable resolution is handled server-side; return placeholder for test
    return `[${expression.trim()}]`;
  });
}

// ─── Port Connection Resolution ───────────────────────────────────────────────

/**
 * Resolves what step to navigate to for a given output port of a step.
 * Reads from step.portConnections (for choice/branch ports) or step.connectAfterId (for default).
 */
export function resolveNextStepId(
  step: WorkflowStep,
  port: string,
  _steps: WorkflowStep[]
): string | null {
  if (port !== "default") {
    // Check portConnections both on the top-level and inside params (written by FlowBuilderTab.addConnection)
    const topLevel = step.portConnections?.[port];
    if (topLevel) return topLevel;
    const inParams = step.params?.portConnections?.[port];
    if (inParams) return inParams;
    return null;
  }
  return step.connectAfterId ?? null;
}

// ─── Step Executor ───────────────────────────────────────────────────────────

/**
 * Executes a single inchat WorkflowStep and returns a StepExecResult.
 */
export function executeWorkflowStep(
  step: WorkflowStep,
  steps: WorkflowStep[],
  ctx: { history: Array<{ sender: string; text: string }> }
): StepExecResult | null {
  const p = step.params ?? {};

  switch (step.stepKey) {
    case "whatsapp":
    case "send-whatsapp": {
      const src = p.whatsappSource || "text";
      if (src === "question") {
        const isButtons = (p.questionType ?? "buttons") === "buttons";
        const buttons = isButtons
          ? (p.questionButtons ?? []).map((b: any, i: number) => ({
              label: b.label || `Button ${i + 1}`,
              nextStepId: resolveNextStepId(step, `choice-${i}`, steps),
              actionType: b.actionType,
              actionValue: b.value,
            }))
          : (p.questionListItems ?? []).map((item: string, i: number) => ({
              label: item || `Item ${i + 1}`,
              nextStepId: resolveNextStepId(step, `choice-${i}`, steps),
            }));
        return {
          stepId: step.id,
          messageText: resolveVars(p.chatMessageText ?? "", ctx.history),
          awaitingInput: false, // tap-driven, not free-text
          buttons,
        };
      }
      if (src === "template") {
        // Template messages are resolved by the caller via buildTemplateMessage
        return {
          stepId: step.id,
          messageText: p.whatsappTemplateIdentifier
            ? `[Template: ${p.whatsappTemplateIdentifier}]`
            : "[WhatsApp Template]",
          awaitingInput: false,
        };
      }
      // text
      return {
        stepId: step.id,
        messageText: resolveVars(p.chatMessageText ?? "", ctx.history),
        awaitingInput: false,
      };
    }

    case "assignhuman":
    case "assign-responsible": {
      return {
        stepId: step.id,
        messageText: "",
        awaitingInput: false,
        assignHuman: {
          personId: p.assignedUser ?? "",
          askFirst: false,
        },
      };
    }

    case "processmovement":
    case "stagemovement":
    case "move-process":
    case "move-stage": {
      return {
        stepId: step.id,
        messageText: "",
        awaitingInput: false,
        stageMove: {
          processId: p.stepDetailProcess ?? "",
          stageId: p.stepDetailStage ?? "",
        },
      };
    }

    case "fieldupdate":
    case "field-update": {
      // Field updates are applied side-effectfully; signal to caller
      return {
        stepId: step.id,
        messageText: "",
        awaitingInput: false,
      };
    }

    case "endworkflow":
    case "end": {
      // Terminates the flow
      return null;
    }

    default: {
      // Unknown/pass-through steps
      return {
        stepId: step.id,
        messageText: "",
        awaitingInput: false,
      };
    }
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

/**
 * Resolves the first step in the inchat lane (lowest connectAfterId chain root).
 */
function findFirstInchatStep(inchatSteps: WorkflowStep[]): WorkflowStep | null {
  if (inchatSteps.length === 0) return null;
  // A "root" step is one that no other step lists as connectAfterId
  const allConnectedAfterIds = new Set(
    inchatSteps.map(s => s.connectAfterId).filter(Boolean)
  );
  const roots = inchatSteps.filter(s => !allConnectedAfterIds.has(s.id));
  return roots[0] ?? inchatSteps[0];
}

/**
 * Converts a step execution result into RuntimeMessages to append to the conversation.
 */
function stepResultToMessages(
  result: StepExecResult,
  conversation: ChatConversationShape
): ChatConversationShape["messages"] {
  const msgs: ChatConversationShape["messages"] = [];
  if (result.messageText) {
    msgs.push({
      id: `msg-${Date.now()}-bot`,
      text: result.messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      origin: "bot",
      buttons: result.buttons?.map(b => ({
        label: b.label,
        nextStepId: b.nextStepId,
        nextNodeId: b.nextStepId,
        actionType: b.actionType,
        actionValue: b.actionValue,
      })),
    });
  }
  return msgs;
}

/**
 * Core runtime entry point — called when the Inbox receives an inbound message from a contact.
 * Mirrors the structure of advanceBotForInboundMessage from conversationBotRuntime.ts.
 */
export function advanceProcessForInboundMessage(
  conversation: ChatConversationShape,
  allSteps: WorkflowStep[],
  incomingText: string,
  nextStepId?: string | null,
  actionType?: string,
  actionValue?: string,
): ProcessAdvanceResult {
  const inchatSteps = allSteps.filter(
    s => (s.trigger ?? "stage") === "inchat"
  );

  // Rule 1: If assigned to a human, automation does NOT respond
  if (conversation.assignedPersonId) {
    let humanName = "team member";
    try {
      const rawEmployees = localStorage.getItem("teamMembers");
      if (rawEmployees) {
        const emp = JSON.parse(rawEmployees).find(
          (e: any) => e.id === conversation.assignedPersonId
        );
        if (emp?.name) humanName = emp.name;
      }
    } catch {}
    return {
      newMessages: [{
        id: `msg-${Date.now()}-sys`,
        text: `🔕 Automation inactive — assigned to ${humanName}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sender: "me",
        origin: "system",
      }],
    };
  }

  // Rule 2: Automation paused/off
  if (conversation.automationStatus !== "active") {
    return {
      newMessages: [{
        id: `msg-${Date.now()}-sys`,
        text: "🔕 Automation paused",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sender: "me",
        origin: "system",
      }],
    };
  }

  const history = (conversation.messages || []).map(m => ({
    sender: m.sender,
    text: m.text,
  }));

  const runtime: ChatRuntimeState = conversation.chatRuntime ?? {
    currentStepId: null,
    awaitingFreeText: false,
    pendingHandoffStepId: null,
  };

  // Rule 3: Terminal action buttons (call/url/email)
  if (actionType && actionType !== "quick_reply") {
    const labels: Record<string, string> = {
      call: `📞 Calling ${actionValue || "…"}`,
      url: `🌐 Opening ${actionValue || "…"}`,
      email: `✉️ Emailing ${actionValue || "…"}`,
    };
    return {
      newMessages: [{
        id: `msg-${Date.now()}-sys`,
        text: labels[actionType] ?? `[${actionType}: ${actionValue}]`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sender: "me",
        origin: "system",
      }],
      runtimePatch: { currentStepId: null, awaitingFreeText: false, pendingHandoffStepId: null },
    };
  }

  // Rule 4: Pending human handoff Y/N
  if (runtime.pendingHandoffStepId && nextStepId === undefined) {
    const handoffStep = inchatSteps.find(s => s.id === runtime.pendingHandoffStepId);
    if (handoffStep) {
      if (incomingText.trim().toLowerCase() === "yes") {
        const personId = handoffStep.params?.assignedUser ?? "";
        let personName = "team member";
        try {
          const rawEmployees = localStorage.getItem("teamMembers");
          if (rawEmployees) {
            const emp = JSON.parse(rawEmployees).find((e: any) => e.id === personId);
            if (emp?.name) personName = emp.name;
          }
        } catch {}
        return {
          newMessages: [{
            id: `msg-${Date.now()}-sys`,
            text: `✅ Conversation assigned to ${personName}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sender: "me",
            origin: "system",
          }],
          assignedPersonIdPatch: personId || "unassigned",
          automationStatusPatch: "paused",
          runtimePatch: { currentStepId: null, awaitingFreeText: false, pendingHandoffStepId: null },
        };
      } else {
        return {
          newMessages: [{
            id: `msg-${Date.now()}-bot`,
            text: "Alright, let's continue then.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sender: "me",
            origin: "bot",
          }],
          runtimePatch: { currentStepId: null, awaitingFreeText: false, pendingHandoffStepId: null },
        };
      }
    }
  }

  let stepResult: StepExecResult | null = null;

  // Rule 5: Button/list tap — navigate directly to the specified step
  if (nextStepId !== undefined) {
    if (nextStepId === null) {
      return {
        newMessages: [{
          id: `msg-${Date.now()}-sys`,
          text: "⚠️ This choice isn't connected to a next step yet — wire it up on the Flow Builder canvas.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "me",
          origin: "system",
        }],
      };
    }
    const targetStep = inchatSteps.find(s => s.id === nextStepId);
    if (targetStep) {
      stepResult = executeWorkflowStep(targetStep, inchatSteps, { history });
    }
  }
  // Rule 6: Awaiting free text — advance via default port
  else if (runtime.currentStepId && runtime.awaitingFreeText) {
    const currentStep = inchatSteps.find(s => s.id === runtime.currentStepId);
    const nextId = currentStep ? resolveNextStepId(currentStep, "default", inchatSteps) : null;
    if (nextId) {
      const nextStep = inchatSteps.find(s => s.id === nextId);
      if (nextStep) {
        stepResult = executeWorkflowStep(nextStep, inchatSteps, { history });
      }
    }
  }
  // Rule 7: No active position — find and run the first inchat step
  else if (!runtime.currentStepId) {
    const firstStep = findFirstInchatStep(inchatSteps);
    if (firstStep) {
      stepResult = executeWorkflowStep(firstStep, inchatSteps, { history });
    }
  }

  if (stepResult) {
    const newMessages = stepResultToMessages(stepResult, conversation);
    const newRuntime: ChatRuntimeState = {
      currentStepId: stepResult.stepId,
      awaitingFreeText: stepResult.awaitingInput,
      pendingHandoffStepId: stepResult.assignHuman ? stepResult.stepId : null,
    };

    const result: ProcessAdvanceResult = {
      newMessages,
      runtimePatch: newRuntime,
    };

    if (stepResult.assignHuman?.personId) {
      result.assignedPersonIdPatch = stepResult.assignHuman.personId;
      result.automationStatusPatch = "paused";
    }

    if (stepResult.stageMove) {
      result.stageMovePatch = stepResult.stageMove;
      console.log("[Chat Runtime] Stage/Process move triggered:", stepResult.stageMove);
    }

    return result;
  }

  // Rule 8: Fallback — Process/Stage Knowledge Base lookup
  if (conversation.processId && conversation.stageId) {
    const sources = getKnowledgeSourcesForStage(conversation.processId, conversation.stageId);
    const lower = incomingText.toLowerCase();
    const hit = sources.find(s =>
      lower.split(/\s+/).some(word => word.length > 3 && s.title.toLowerCase().includes(word))
    );
    if (hit) {
      return {
        newMessages: [{
          id: `msg-${Date.now()}-kb`,
          text: hit.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "me",
          origin: "bot",
        }],
        runtimePatch: { currentStepId: null, awaitingFreeText: false, pendingHandoffStepId: null },
      };
    }
  }

  // No match — no response (automation stays silent when nothing matches)
  return { newMessages: [] };
}
