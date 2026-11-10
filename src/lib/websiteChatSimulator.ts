import { createContactWithoutProcess } from "./clientProcessState";
import { addActivityEntry } from "./activityLog";
import { syncTestMessagesToInbox } from "./testConversationSync";

export interface WebsiteVisitorParams {
  name: string;
  email?: string;
  phone?: string;
  processId?: string;
  firstMessage: string;
  requirementLabel?: string;
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

export function processWebsiteVisitorSubmission({
  name,
  email = "",
  phone = "",
  firstMessage,
  requirementLabel,
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
    // Auto-created contacts must not be assigned to or trigger any Process
    const newClient = createContactWithoutProcess(
      name,
      phone || "+1 (555) 019-9090",
      email,
      stageName
    );
    clientId = newClient ? newClient.id : `CL-SIM-${Date.now()}`;
  }

  // Auto-created contacts must not be assigned to or trigger any Process.
  // Log website_message activity
  addActivityEntry({
    clientId,
    processId: "website",
    processName: "Website Chat",
    type: "website_message",
    refId: `website-msg-${Date.now()}`,
    status: "success",
    direction: "inbound",
    details: {
      primary: `Received message: "${firstMessage}"`,
      secondary: `via Website Chat Widget${requirementLabel ? ` · Req: ${requirementLabel}` : ""}`,
    },
  });

  const replyText =
    "Hello! Thank you for reaching out to us. We have received your message and a team member will be with you shortly.";

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
        { sender: "me", text: replyText, origin: "bot" },
      ],
    });
  } catch {}

  return {
    clientId,
    clientName: name,
    stageName,
    processName: "Website Chat",
    botReply: replyText,
    header: undefined as any,
    footerText: undefined as any,
    buttons: [] as any[],
    isNewClient,
  };
}
