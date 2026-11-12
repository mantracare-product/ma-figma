import { createContactWithoutProcess } from "./clientProcessState";
import { addActivityEntry } from "./activityLog";
import { syncTestMessagesToInbox } from "./testConversationSync";
import {
  getStoredProcesses,
  DEFAULT_ENTITY_PROCESSES,
  EntityType,
  Process,
} from "./useProcessStore";
import { generateProcessStageReply } from "./processChatSimulator";

export interface WebsiteVisitorParams {
  name: string;
  email?: string;
  phone?: string;
  entityType?: string;
  processId?: string;
  firstMessage: string;
  requirementLabel?: string;
  contactCategory?: string;
  stageName?: string;
}

function getStoredClientsList(): any[] {
  try {
    const raw = sessionStorage.getItem("clients");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function resolveMappedWorkflow(processId?: string, entityType?: string): Process | undefined {
  const processes = getStoredProcesses();
  if (processId) {
    const direct = processes.find((p) => p.id === processId);
    if (direct) return direct;
  }
  if (entityType) {
    const byEntity = processes.find((p) => (p.entityType || "client") === entityType);
    if (byEntity) return byEntity;
    if (entityType !== "client" && DEFAULT_ENTITY_PROCESSES[entityType as Exclude<EntityType, "client">]) {
      return DEFAULT_ENTITY_PROCESSES[entityType as Exclude<EntityType, "client">];
    }
  }
  return undefined;
}

function resolveWorkflowPrompt(proc?: Process): string | undefined {
  if (!proc) return undefined;
  const firstStage: any = proc.stages?.[0];
  if (firstStage?.callerPitchMode === "comprehensive" && firstStage?.greetingIntroMessage?.trim()) {
    return firstStage.greetingIntroMessage.trim();
  }
  if (firstStage?.callerPitch?.trim()) {
    return firstStage.callerPitch.trim();
  }
  if (proc.description?.trim()) {
    return proc.description.trim();
  }
  return undefined;
}

export function processWebsiteVisitorSubmission({
  name,
  email = "",
  phone = "",
  entityType,
  processId,
  firstMessage,
  requirementLabel,
  contactCategory = "Lead",
  stageName = "New Contact",
}: WebsiteVisitorParams) {
  // 1. Check if client already exists
  const existingClients = getStoredClientsList();
  const cleanPhone = phone.replace(/\D/g, "");
  let client = existingClients.find(
    (c) =>
      (cleanPhone && (c.phone || c.phoneNumber || "").replace(/\D/g, "") === cleanPhone) ||
      (email && c.email?.toLowerCase() === email.toLowerCase()) ||
      (c.name?.toLowerCase() === name.toLowerCase())
  );

  let clientId: string;
  let isNewClient = false;

  if (client) {
    clientId = client.id;
  } else {
    isNewClient = true;
    // Auto-created contacts use Contact Category and must not be enrolled into a process/stage
    const newClient = createContactWithoutProcess(
      name,
      phone || "+1 (555) 019-9090",
      email,
      stageName,
      contactCategory || "Lead"
    );
    clientId = newClient ? newClient.id : `CL-SIM-${Date.now()}`;
  }

  // 2. Resolve mapped workflow & prompt for the selected requirement (Process Entity + Workflow Name)
  const mappedWorkflow = resolveMappedWorkflow(processId, entityType);
  const workflowPrompt = resolveWorkflowPrompt(mappedWorkflow);
  const initialStage = mappedWorkflow?.stages?.[0];

  addActivityEntry({
    clientId,
    processId: mappedWorkflow?.id || "website",
    processName: mappedWorkflow?.name || "Website Chat",
    type: "website_message",
    refId: `website-msg-${Date.now()}`,
    status: "success",
    direction: "inbound",
    details: {
      primary: `Received message: "${firstMessage}"`,
      secondary: `via Website Chat Widget${requirementLabel ? ` · Req: ${requirementLabel}` : ""}${
        mappedWorkflow ? ` · Workflow: ${mappedWorkflow.name}` : ""
      }`,
    },
  });

  let replyText = mappedWorkflow
    ? `Hello! Thank you for reaching out regarding ${requirementLabel || mappedWorkflow.name}. Using the "${mappedWorkflow.name}" workflow${
        workflowPrompt ? ` — ${workflowPrompt}` : ", how can I assist you with your request?"
      }`
    : "Hello! Thank you for reaching out to us. We have received your message and a team member will be with you shortly.";
  let header: any = undefined;
  let footerText: any = undefined;
  let buttons: any[] = [];

  if (initialStage) {
    const workflowSteps = (initialStage as any).workflowSteps ?? [];
    const simReply = generateProcessStageReply(initialStage, workflowSteps, firstMessage, [], "website");
    if (simReply?.firedAutomation && simReply.text) {
      replyText = simReply.text;
      header = simReply.header;
      footerText = simReply.footerText;
      buttons = simReply.buttons || [];
    } else if (workflowPrompt) {
      replyText = workflowPrompt;
    }
  }

  // Sync test message to Inbox
  try {
    syncTestMessagesToInbox({
      clientId,
      channel: "website",
      contactName: name,
      phoneNumber: phone || "+1 (555) 019-9090",
      inboxNumber: "Website Chat Widget",
      messages: [
        { sender: "contact", text: firstMessage },
        { sender: "me", text: replyText, origin: "bot", header, footerText, buttons },
      ],
    });
  } catch {}

  return {
    clientId,
    clientName: name,
    contactCategory: contactCategory || "Lead",
    stageName: initialStage?.name || stageName,
    entityType: mappedWorkflow?.entityType || entityType,
    processId: mappedWorkflow?.id,
    processName: mappedWorkflow?.name || "Website Chat",
    workflowPrompt,
    botReply: replyText,
    header,
    footerText,
    buttons,
    isNewClient,
  };
}
