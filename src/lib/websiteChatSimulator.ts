import { createClientWithProcessStage } from "./clientProcessState";
import { addActivityEntry } from "./activityLog";
import { addProcessCallLog, updateProcessCallLogStage } from "./processLogsStore";
import { getStoredProcesses } from "./useProcessStore";
import { generateProcessStageReply } from "./processChatSimulator";
import { syncTestMessagesToInbox } from "./testConversationSync";

export interface WebsiteVisitorParams {
  name: string;
  email?: string;
  phone?: string;
  processId: string;
  firstMessage: string;
  requirementLabel?: string;
}

function getStoredClientsList(): any[] {
  try {
    const raw = sessionStorage.getItem("clients");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function processWebsiteVisitorSubmission({
  name,
  email = "",
  phone = "",
  processId,
  firstMessage,
  requirementLabel,
}: WebsiteVisitorParams) {
  const processes = getStoredProcesses();
  const targetProcess = processes.find((p) => p.id === processId) || processes[0];
  const initialStage = targetProcess?.stages[0];

  if (!targetProcess || !initialStage) return null;

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
  let stageName = initialStage.name;
  let isNewClient = false;

  if (client) {
    clientId = client.id;
    const matchingStage = (client as any).processStages?.find(
      (s: any) => s.processId === targetProcess.id || s.processName === targetProcess.name
    );
    if (matchingStage) {
      stageName = matchingStage.stageName;
    }
  } else {
    isNewClient = true;
    const newClient = createClientWithProcessStage(
      name,
      phone || "+1 (555) 019-9090",
      {
        processId: targetProcess.id,
        processName: targetProcess.name,
        stageId: initialStage.id,
        stageName: initialStage.name,
        channel: "website" as any,
      }
    );
    clientId = newClient ? newClient.id : `CL-SIM-${Date.now()}`;
  }

  // 2. Log process_entry activity
  const reqText = requirementLabel ? ` (${requirementLabel})` : "";
  addActivityEntry({
    clientId,
    processId: targetProcess.id,
    processName: targetProcess.name,
    type: "process_entry",
    refId: `website-entry-${Date.now()}`,
    status: "success",
    details: {
      primary: `Entered ${targetProcess.name}${reqText} via Website Chat Widget`,
      secondary: stageName,
    },
  });

  // Log website_message activity
  addActivityEntry({
    clientId,
    processId: targetProcess.id,
    processName: targetProcess.name,
    type: "website_message",
    refId: `website-msg-${Date.now()}`,
    status: "success",
    direction: "inbound",
    details: {
      primary: `Received message: "${firstMessage}"`,
      secondary: `via Website Chat Widget · Stage: ${stageName}`,
    },
  });

  // 3. Add process log row for Processes table
  addProcessCallLog({
    clientId,
    clientName: name,
    processName: targetProcess.name,
    stageName,
    channel: "website",
  });

  // 4. Generate automation reply
  const workflowSteps = (initialStage as any).workflowSteps ?? [];
  const result = generateProcessStageReply(initialStage, workflowSteps, firstMessage, []);

  // Handle stage transition if triggered
  if (result.newStageName) {
    const newStageObj = targetProcess.stages.find((s) => s.name === result.newStageName);
    if (newStageObj) {
      updateProcessCallLogStage(clientId, targetProcess.name, newStageObj.name);
      addActivityEntry({
        clientId,
        processId: targetProcess.id,
        processName: targetProcess.name,
        type: "stage_update",
        refId: `website-stage-${Date.now()}`,
        status: "success",
        details: {
          primary: `Moved to stage: ${newStageObj.name}`,
          secondary: "via Website Chat Bot",
        },
      });
    }
  }

  // 5. Sync to Inbox
  syncTestMessagesToInbox({
    clientId,
    contactName: name,
    phoneNumber: phone || "+1 (555) 019-9090",
    inboxNumber: "Website Chat Widget",
    channel: "website",
    messages: [
      { text: firstMessage, sender: "contact" },
      {
        text: result.text,
        sender: "me",
        origin: result.firedAutomation ? "template" : "bot",
        header: result.header,
        footerText: result.footerText,
        buttons: result.buttons,
      },
    ],
  });

  return {
    clientId,
    isNewClient,
    processName: targetProcess.name,
    stageName,
    botReply: result.text,
    header: result.header,
    footerText: result.footerText,
    buttons: result.buttons,
  };
}
