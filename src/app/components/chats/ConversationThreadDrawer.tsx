import React from "react";
import { useConversations } from "../../../lib/useConversations";
import ConversationHeader from "./ConversationHeader";
import MessageThreadList from "./MessageThreadList";
import MessageComposerBar from "./MessageComposerBar";
import { WhatsappTemplate, Campaign } from "../../pages/Chats";
import { toast } from "sonner";

export interface ConversationThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}

export default function ConversationThreadDrawer({
  isOpen,
  onClose,
  conversationId,
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

  // 1. Resolve conversation cleanly
  const conversation =
    getConversation(conversationId) ||
    findConversationForClient({ clientId, phone: clientPhone, name: clientName }) ||
    findOrCreateConversationForClient({
      clientId: clientId || "CL-001",
      phone: clientPhone || "+1 (555) 234-5678",
      name: clientName || "Sarah Jenkins",
      channel: "whatsapp",
    });

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
