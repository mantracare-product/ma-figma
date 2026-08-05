import React from "react";
import { useConversations, Message } from "../../../lib/useConversations";
import { getActivity } from "../../../lib/activityEngine";
import ConversationHeader from "./ConversationHeader";
import MessageThreadList from "./MessageThreadList";
import MessageComposerBar from "./MessageComposerBar";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { toast } from "sonner";

export interface ConversationThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  channel?: "whatsapp" | "sms" | "website";
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}

export default function ConversationThreadDrawer({
  isOpen,
  onClose,
  conversationId,
  channel: propsChannel,
  clientId,
  clientName,
  clientPhone,
}: ConversationThreadDrawerProps) {
  const {
    conversations,
    getConversation,
    findConversationForClient,
    findOrCreateConversationForClient,
    sendMessage,
    sendTemplate,
    getSessionWindow,
  } = useConversations();

  if (!isOpen) return null;

  const targetChannel = propsChannel || "whatsapp";

  // 1. Resolve conversation cleanly
  let conversation =
    getConversation(conversationId) ||
    findConversationForClient({ clientId, phone: clientPhone, name: clientName, channel: targetChannel }) ||
    findOrCreateConversationForClient({
      clientId: clientId || "CL-001",
      phone: clientPhone || "+1 (555) 123-4567",
      name: clientName || "Client",
      channel: targetChannel,
    });

  // Ensure channel matches targetChannel
  if (propsChannel && conversation.channel !== propsChannel) {
    conversation = findOrCreateConversationForClient({
      clientId: clientId || conversation.clientId,
      phone: clientPhone || conversation.phoneNumber,
      name: clientName || conversation.contactName,
      channel: propsChannel,
    });
  }

  // If conversation has 0 messages, sync messages from activity log or default sample
  if (!conversation.messages || conversation.messages.length === 0) {
    const targetClientId = clientId || conversation.clientId || "CL-001";
    const activityEntries = getActivity(targetClientId);
    const matchingActivities = activityEntries.filter((a: any) => {
      const rawType = a.rawType || a.type;
      if (conversation.channel === "sms") return rawType === "sms";
      if (conversation.channel === "whatsapp") return rawType === "whatsapp";
      if (conversation.channel === "website") return rawType === "website_message" || rawType === "website";
      return false;
    });

    if (matchingActivities.length > 0) {
      const syncedMsgs: Message[] = matchingActivities.map((a: any, idx: number) => ({
        id: `msg-synced-${a.id || idx}`,
        text: a.messageText || a.details?.primary || "Message",
        timestamp: a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
        sender: (a.direction === "outbound" || a.direction === "sent" ? "me" : "contact") as "me" | "contact",
        status: "delivered" as const,
      })).reverse();

      conversation = {
        ...conversation,
        messages: syncedMsgs,
        lastMessage: syncedMsgs[syncedMsgs.length - 1].text,
      };
    } else {
      const defaultSampleMsgs: Record<string, Message[]> = {
        sms: [
          { id: "msg-sms-1-1", text: "Hi! This is an SMS reminder regarding your upcoming appointment. Reply YES to confirm or call us if you need to reschedule.", timestamp: "Yesterday 8:30 AM", sender: "me" as const, status: "delivered" as const },
          { id: "msg-sms-1-2", text: "YES, I will be there on time!", timestamp: "Yesterday 9:15 AM", sender: "contact" as const, status: "delivered" as const },
        ],
        whatsapp: [
          { id: "msg-1-1", text: "Hello! Thank you for contacting Mantra Health.", timestamp: "Yesterday 10:00 AM", sender: "me" as const, status: "read" as const },
          { id: "msg-1-2", text: "Could I reschedule my appointment for tomorrow?", timestamp: "Yesterday 10:15 AM", sender: "contact" as const, status: "delivered" as const },
          { id: "msg-1-3", text: "I wanted to change my appointment slot to 3:00 PM if possible.", timestamp: "Yesterday 10:35 AM", sender: "contact" as const, status: "delivered" as const },
        ],
      };
      const sample = defaultSampleMsgs[conversation.channel];
      if (sample) {
        conversation = {
          ...conversation,
          messages: sample,
          lastMessage: sample[sample.length - 1].text,
        };
      }
    }
  }

  const session = getSessionWindow(conversation.id);

  const handleSendMessage = (text: string) => {
    sendMessage(conversation.id, text);
    toast.success("Message sent");
  };

  const handleSendTemplate = (template: WhatsappTemplate) => {
    sendTemplate(conversation.id, template);
    toast.success(`Template "${template.name}" sent`);
  };

  const handleEnrollCampaign = (campaign: Campaign) => {
    const firstStepText = campaign.nodes[0]?.content || `Enrolled in campaign "${campaign.name}"`;
    sendMessage(conversation.id, firstStepText);
    toast.success(`Enrolled in campaign "${campaign.name}"`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Shared Header */}
        <ConversationHeader
          conversation={conversation}
          isDrawer={true}
          onClose={onClose}
        />

        {/* Shared Message List */}
        <MessageThreadList
          messages={conversation.messages}
          emptyMessage="No messages in this conversation yet."
        />

        {/* Shared Composer Bar */}
        <MessageComposerBar
          conversation={conversation}
          session={session}
          onSendMessage={handleSendMessage}
          onSendTemplate={handleSendTemplate}
          onEnrollCampaign={handleEnrollCampaign}
        />
      </div>
    </div>
  );
}
