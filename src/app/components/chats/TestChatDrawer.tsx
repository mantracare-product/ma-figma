import React from "react";
import { X } from "lucide-react";
import BotTestChatPanel from "./BotTestChatPanel";
import { Bot } from "./ChatbotTab";
import { WhatsappTemplate } from "../../pages/Chats";

interface TestChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bot: Bot; // the live in-editor draft
  employees: { id: string; name: string }[];
  templates: WhatsappTemplate[];
}

export default function TestChatDrawer({ isOpen, onClose, bot, employees, templates }: TestChatDrawerProps) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl" style={{ width: "420px" }}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Test "{bot.name}"</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <BotTestChatPanel bot={bot} employees={employees} templates={templates} />
        </div>
      </div>
    </>
  );
}
