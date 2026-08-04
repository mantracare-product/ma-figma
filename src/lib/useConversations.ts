import { useState, useEffect } from "react";
import { WhatsappTemplate } from "../app/pages/Chats";
import { TEST_CHAT_SYNC_EVENT } from "./testConversationSync";
import { DEFAULT_MOCK_NUMBERS } from "./useWhatsAppNumbers";
import { resolveTestVariables } from "./chatbotTestReply";
import { buildTemplateMessage } from "./conversationBotRuntime";
import { appendActivity } from "./activityEngine";

export interface Message {
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
  footerText?: string;
}

export interface Conversation {
  id: string;
  clientId?: string;
  contactName: string;
  phoneNumber: string;
  inboxNumber?: string;
  channel: "whatsapp" | "sms" | "website";
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "open" | "resolved";
  messages: Message[];
  botStatus?: "active" | "paused" | "off";
  assignedPersonId?: string;
  assignedBotId?: string;
  botRuntime?: {
    currentNodeId: string | null;
    awaitingFreeText: boolean;
    pendingHandoffNodeId: string | null;
  };
  campaignEnrollments?: Array<{
    campaignId: string;
    currentNodeIndex: number;
    enrolledAt: string;
    status: "active" | "completed" | "paused";
    nextRunAt?: string;
  }>;
}

export interface SessionWindowStatus {
  channel: "whatsapp" | "sms" | "website";
  lastInboundAt: string | null;
  hoursRemaining: number | null;
  isExpired: boolean;
  freeFormAllowed: boolean;
}

const STORAGE_KEY = "whatsappMockConversations";

export const INITIAL_MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    clientId: "CL-001",
    contactName: "Sarah Jenkins",
    phoneNumber: "+1 (555) 234-5678",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "I wanted to change my appointment slot to 3:00 PM if possible.",
    timestamp: "10:35 AM",
    unreadCount: 2,
    status: "open",
    messages: [
      { id: "msg-1-1", text: "Hello! Thank you for contacting Mantra Health.", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "me", status: "read" },
      { id: "msg-1-2", text: "Could I reschedule my appointment for tomorrow?", timestamp: new Date(Date.now() - 1800000).toISOString(), sender: "contact" },
      { id: "msg-1-3", text: "I wanted to change my appointment slot to 3:00 PM if possible.", timestamp: new Date(Date.now() - 900000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-2",
    clientId: "CL-002",
    contactName: "Michael Chang",
    phoneNumber: "+1 (555) 876-5432",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Thanks for the update!",
    timestamp: "Yesterday",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-2-1", text: "Hi, has my lab report come back yet?", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "contact" },
      { id: "msg-2-2", text: "Yes! Everything looks normal, we'll email the full report shortly.", timestamp: new Date(Date.now() - 85000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-2-3", text: "Thanks for the update!", timestamp: new Date(Date.now() - 84000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-3",
    clientId: "CL-003",
    contactName: "Elena Rostova",
    phoneNumber: "+1 (555) 345-6789",
    inboxNumber: "+1 (555) 987-6543",
    channel: "whatsapp",
    lastMessage: "Awesome service! Thanks for checking in.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-3-1", text: "Hello Elena, how is your recovery progressing?", timestamp: new Date(Date.now() - 100000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-3-2", text: "Awesome service! Thanks for checking in.", timestamp: new Date(Date.now() - 95000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-4",
    clientId: "CL-004",
    contactName: "Priya Nair",
    phoneNumber: "+1 (555) 345-8901",
    inboxNumber: "+1 (555) 987-6543",
    channel: "whatsapp",
    lastMessage: "Sounds good, thank you!",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-4-1", text: "Do you have any openings this Friday?", timestamp: new Date(Date.now() - 250000000).toISOString(), sender: "contact" },
      { id: "msg-4-2", text: "Yes, we have a 11:00 AM slot open.", timestamp: new Date(Date.now() - 245000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-4-3", text: "Sounds good, thank you!", timestamp: new Date(Date.now() - 240000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-5",
    clientId: "CL-005",
    contactName: "David Miller",
    phoneNumber: "+1 (555) 432-1000",
    inboxNumber: "+1 (555) 432-1000",
    channel: "sms",
    lastMessage: "Thanks, I will confirm by tonight.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-5-1", text: "Hi David, your lab reports have been received.", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-5-2", text: "Thanks, I will confirm by tonight.", timestamp: new Date(Date.now() - 85000000).toISOString(), sender: "contact" },
    ],
    botStatus: "paused",
    assignedPersonId: "1",
  },
  {
    id: "conv-6",
    clientId: "CL-006",
    contactName: "Alex Rivera",
    phoneNumber: "Website Visitor",
    channel: "website",
    lastMessage: "Do you accept walk-ins?",
    timestamp: "2 hours ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-6-1", text: "Hi! How can I help you today?", timestamp: new Date(Date.now() - 7200000).toISOString(), sender: "me", status: "read" },
      { id: "msg-6-2", text: "Do you accept walk-ins?", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
];

export function getStoredConversations(): Conversation[] {
  const validNumbers = new Set(DEFAULT_MOCK_NUMBERS.map((n) => n.displayPhoneNumber));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Conversation[] = JSON.parse(raw);
      const updated = parsed.map((c) => {
        if (c.channel === "whatsapp" && (!c.inboxNumber || !validNumbers.has(c.inboxNumber))) {
          return { ...c, inboxNumber: DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber };
        }
        return c;
      });
      return updated;
    }
  } catch {}
  return INITIAL_MOCK_CONVERSATIONS;
}

export function saveStoredConversations(convs: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    window.dispatchEvent(new Event(TEST_CHAT_SYNC_EVENT));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

export function computeSessionWindow(conv?: Conversation): SessionWindowStatus {
  if (!conv) {
    return {
      channel: "whatsapp",
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  if (conv.channel !== "whatsapp") {
    return {
      channel: conv.channel,
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  const inboundMsgs = (conv.messages || []).filter((m) => m.sender === "contact");
  if (inboundMsgs.length === 0) {
    return {
      channel: "whatsapp",
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  const lastInbound = inboundMsgs[inboundMsgs.length - 1];
  let inboundDate: Date;

  if (lastInbound.timestamp) {
    const parsedDate = new Date(lastInbound.timestamp);
    if (!isNaN(parsedDate.getTime())) {
      inboundDate = parsedDate;
    } else if (lastInbound.timestamp.includes("Yesterday")) {
      inboundDate = new Date(Date.now() - 24 * 3600 * 1000);
    } else if (lastInbound.timestamp.includes("days ago")) {
      inboundDate = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    } else {
      inboundDate = new Date(Date.now() - 3600 * 1000);
    }
  } else {
    inboundDate = new Date(Date.now() - 3600 * 1000);
  }

  const elapsedMs = Math.max(0, Date.now() - inboundDate.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, Math.round((24 - elapsedHours) * 10) / 10);
  const isExpired = elapsedHours >= 24;

  return {
    channel: "whatsapp",
    lastInboundAt: inboundDate.toISOString(),
    hoursRemaining: isExpired ? 0 : hoursRemaining,
    isExpired,
    freeFormAllowed: !isExpired,
  };
}

export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>(getStoredConversations);

  useEffect(() => {
    const handleUpdate = () => setConversationsState(getStoredConversations());
    window.addEventListener(TEST_CHAT_SYNC_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TEST_CHAT_SYNC_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setConversations = (action: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    const current = getStoredConversations();
    const next = typeof action === "function" ? action(current) : action;
    saveStoredConversations(next);
    setConversationsState(next);
  };

  const getConversation = (id: string): Conversation | undefined => {
    return conversations.find((c) => c.id === id);
  };

  const findConversationForClient = (opts: { clientId?: string; phone?: string; name?: string }): Conversation | undefined => {
    if (opts.clientId) {
      const match = conversations.find((c) => (c as any).clientId === opts.clientId || c.id === opts.clientId);
      if (match) return match;
    }
    if (opts.phone) {
      const cleanTarget = opts.phone.replace(/\D/g, "");
      if (cleanTarget) {
        const match = conversations.find((c) => c.phoneNumber.replace(/\D/g, "").includes(cleanTarget) || cleanTarget.includes(c.phoneNumber.replace(/\D/g, "")));
        if (match) return match;
      }
    }
    if (opts.name) {
      const targetName = opts.name.toLowerCase();
      const match = conversations.find((c) => c.contactName.toLowerCase().includes(targetName) || targetName.includes(c.contactName.toLowerCase()));
      if (match) return match;
    }
    return undefined;
  };

  const findOrCreateConversationForClient = (opts: {
    clientId?: string;
    phone?: string;
    name?: string;
    channel?: "whatsapp" | "sms" | "website";
  }): Conversation => {
    const existing = findConversationForClient(opts);
    if (existing) return existing;

    const channel = opts.channel || "whatsapp";
    const newConv: Conversation = {
      id: `conv-auto-${Date.now()}`,
      clientId: opts.clientId,
      contactName: opts.name || "Client",
      phoneNumber: opts.phone || "+1 (555) 010-0100",
      inboxNumber: DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber,
      channel,
      lastMessage: "",
      timestamp: "Just now",
      unreadCount: 0,
      status: "open",
      messages: [],
      botStatus: "off",
      assignedPersonId: "",
    };

    setConversations((prev) => [...prev, newConv]);
    return newConv;
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const targetId = conv ? conv.id : conversationId;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      status: "read",
      origin: "human",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              lastMessage: text.trim(),
              timestamp: "Just now",
              messages: [...c.messages, newMessage],
            }
          : c
      )
    );

    // Dual-write to activityEngine so Activity Tab timeline updates immediately
    if (conv) {
      const targetClientId = conv.clientId || "CL-001";
      const actType = conv.channel === "sms" ? "sms" : conv.channel === "website" ? "website_message" : "whatsapp";
      appendActivity({
        type: actType as any,
        clientId: targetClientId,
        timestamp: new Date().toISOString(),
        direction: "sent" as any,
        status: "delivered" as any,
        messageText: text.trim(),
        phoneNumber: conv.phoneNumber,
        refId: conv.id,
        details: {
          primary: text.trim(),
          secondary: `To: ${conv.contactName} (${conv.phoneNumber})`,
        },
      } as any);
    }
  };

  const sendTemplate = (conversationId: string, template: WhatsappTemplate) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const targetId = conv ? conv.id : conversationId;

    const resolvedText = resolveTestVariables(template.bodyText || "");
    const built = buildTemplateMessage(template, resolvedText);
    const templateMsg: Message = {
      id: `msg-${Date.now()}`,
      text: built.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      origin: "template",
      status: "read",
      buttons: built.buttons as any,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              lastMessage: resolvedText,
              timestamp: "Just now",
              messages: [...c.messages, templateMsg],
            }
          : c
      )
    );

    // Dual-write to activityEngine
    if (conv) {
      const targetClientId = conv.clientId || "CL-001";
      appendActivity({
        type: "whatsapp",
        clientId: targetClientId,
        timestamp: new Date().toISOString(),
        direction: "sent" as any,
        status: "delivered" as any,
        messageText: resolvedText,
        phoneNumber: conv.phoneNumber,
        refId: conv.id,
        details: {
          primary: `Template: ${template.name}`,
          secondary: resolvedText,
        },
      } as any);
    }
  };

  const getSessionWindow = (conversationId: string): SessionWindowStatus => {
    const conv = getConversation(conversationId);
    return computeSessionWindow(conv);
  };

  return {
    conversations,
    setConversations,
    getConversation,
    findConversationForClient,
    findOrCreateConversationForClient,
    sendMessage,
    sendTemplate,
    getSessionWindow,
  };
}
