export const TEST_CHAT_SYNC_EVENT = "testChatSync_updated";
const CONV_STORAGE_KEY = "whatsappMockConversations";

interface SyncMessageInput {
  text: string;
  sender: "contact" | "me";
  origin?: "human" | "bot" | "template" | "campaign" | "system";
  header?: {
    type?: "none" | "text" | "image" | "video" | "document";
    text?: string;
    fileName?: string;
  };
  footerText?: string;
  buttons?: Array<{ label: string; type?: string; value?: string }>;
}

interface SyncParams {
  clientId?: string;
  contactName: string;
  phoneNumber: string;
  inboxNumber: string;
  channel: "whatsapp" | "sms";
  messages: SyncMessageInput[];
}

function readConversations(): any[] {
  try {
    const raw = localStorage.getItem(CONV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeConversations(convs: any[]) {
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(convs));
  window.dispatchEvent(new Event(TEST_CHAT_SYNC_EVENT));
}

// Finds or creates a conversation for this phone number, appends the given
// messages, and updates lastMessage/timestamp/unreadCount — same shape Chats.tsx expects.
export function syncTestMessagesToInbox({ clientId, contactName, phoneNumber, inboxNumber, channel, messages }: SyncParams) {
  const convs = readConversations();
  let idx = convs.findIndex((c) => c.phoneNumber === phoneNumber && c.channel === channel);

  const newMsgObjs = messages.map((m) => ({
    id: `msg-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: m.text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sender: m.sender,
    origin: m.origin ?? (m.sender === "contact" ? undefined : "bot"),
    status: m.sender === "me" ? "read" : undefined,
    ...(m.header ? { header: m.header } : {}),
    ...(m.footerText ? { footerText: m.footerText } : {}),
    ...(m.buttons ? { buttons: m.buttons } : {}),
  }));

  if (idx === -1) {
    convs.push({
      id: `conv-test-${Date.now()}`,
      clientId,
      contactName,
      phoneNumber,
      inboxNumber,
      channel,
      lastMessage: newMsgObjs[newMsgObjs.length - 1]?.text ?? "",
      timestamp: "Just now",
      unreadCount: newMsgObjs.filter((m) => m.sender === "contact").length,
      status: "open",
      messages: newMsgObjs,
      botStatus: "active",
      assignedPersonId: "",
    });
  } else {
    const existing = convs[idx];
    convs[idx] = {
      ...existing,
      ...(clientId ? { clientId } : {}),
      lastMessage: newMsgObjs[newMsgObjs.length - 1]?.text ?? existing.lastMessage,
      timestamp: "Just now",
      unreadCount: existing.unreadCount + newMsgObjs.filter((m) => m.sender === "contact").length,
      messages: [...existing.messages, ...newMsgObjs],
    };
  }

  writeConversations(convs);
}
