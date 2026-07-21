import React from "react";
import { Phone, ExternalLink, Mail } from "lucide-react";
import { ButtonAction } from "../../../lib/chatbotTypes";

interface WhatsAppMessagePreviewProps {
  botName: string;
  messageType?: "text" | "image" | "video" | "audio" | "document";
  headerType?: "none" | "text" | "image" | "video" | "document";
  headerText?: string;
  headerMediaUrl?: string;
  headerFileName?: string;
  text: string;
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
  /** Accepts either legacy plain string[] or new ButtonAction[] */
  buttons?: Array<ButtonAction | string>;
  listItems?: string[]; // Ask a Question "list" mode
  flipped?: boolean;
}

function getButtonIcon(actionType: ButtonAction["actionType"] | undefined) {
  if (actionType === "call") return <Phone className="w-3 h-3 shrink-0" />;
  if (actionType === "url") return <ExternalLink className="w-3 h-3 shrink-0" />;
  if (actionType === "email") return <Mail className="w-3 h-3 shrink-0" />;
  return null;
}

export default function WhatsAppMessagePreview({
  botName,
  messageType = "text",
  headerType = "none",
  headerText,
  headerMediaUrl,
  headerFileName,
  text,
  mediaUrl,
  caption,
  fileName,
  buttons,
  listItems,
  flipped = false,
}: WhatsAppMessagePreviewProps) {
  // Normalise buttons to a display list — support both plain strings and ButtonAction objects
  const buttonItems: Array<{ label: string; actionType?: ButtonAction["actionType"] }> =
    (buttons ?? []).map(b =>
      typeof b === "string"
        ? { label: b }
        : { label: b.label, actionType: b.actionType }
    );

  const listLabels = listItems?.length ? listItems : [];
  const hasButtons = buttonItems.length > 0;
  const hasListItems = !hasButtons && listLabels.length > 0;

  return (
    <div className="rounded-2xl border-4 border-gray-800 overflow-hidden shadow-inner bg-[#E5DDD5] h-[300px] flex flex-col">
      {/* Phone header */}
      <div className="bg-[#075E54] text-white p-2.5 flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
          {botName.substring(0, 2).toUpperCase()}
        </div>
        <p className="text-[10px] font-bold">{botName}</p>
      </div>

      {/* Message Area */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end">
        <div className={`rounded-lg shadow-sm p-2 text-[11px] text-gray-800 max-w-[90%] space-y-1.5 select-none relative ${
          flipped ? "bg-[#DCF8C6] ml-auto rounded-tr-none" : "bg-white rounded-tl-none"
        }`}>
          {/* Header section if headerType !== "none" */}
          {headerType !== "none" && (
            <div className="border-b border-gray-100 pb-1 mb-1">
              {headerType === "text" && headerText && (
                <p className="font-bold text-[11px] text-gray-900">{headerText}</p>
              )}
              {headerType !== "text" && (
                <div className="rounded bg-gray-100 border border-gray-200 px-2 py-2 text-center text-[9px] text-gray-600 font-mono">
                  {headerType === "image" ? "🖼️ Header Image" : headerType === "video" ? "🎬 Header Video" : "📄 " + (headerFileName || "Header Document")}
                  {headerMediaUrl ? <span className="block text-[8px] text-gray-400 truncate mt-0.5">{headerMediaUrl}</span> : null}
                </div>
              )}
            </div>
          )}
          {messageType !== "text" && mediaUrl && (
            <div className="rounded bg-gray-100 border border-gray-200 px-2 py-3 text-center text-[9px] text-gray-500 font-mono">
              {messageType === "image" ? "🖼️" : messageType === "video" ? "🎬" : messageType === "audio" ? "🎵" : "📄"}{" "}
              {messageType === "document" ? (fileName || "Document") : messageType.charAt(0).toUpperCase() + messageType.slice(1)}
            </div>
          )}
          {caption && messageType === "image" && (
            <p className="text-[10px] text-gray-500 italic border-b pb-1 border-gray-100">{caption}</p>
          )}
          <p className="whitespace-pre-wrap leading-tight text-gray-700">{text || "Message text..."}</p>
        </div>

        {/* WhatsApp-style buttons attached directly underneath */}
        {hasButtons && (
          <div className="bg-white rounded-b-lg shadow-sm max-w-[90%] mt-0.5 overflow-hidden border-t border-gray-100 select-none">
            {buttonItems.map((btn, i) => (
              <div
                key={i}
                className={`px-3 py-2 text-[10px] font-bold text-center text-blue-600 flex items-center justify-center gap-1 ${
                  i > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                {getButtonIcon(btn.actionType)}
                <span>{btn.label || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}

        {/* List items */}
        {hasListItems && (
          <div className="bg-white rounded-b-lg shadow-sm max-w-[90%] mt-0.5 overflow-hidden border-t border-gray-100 select-none">
            {listLabels.map((item, i) => (
              <div
                key={i}
                className={`px-3 py-2 text-[10px] font-bold text-center text-blue-600 flex items-center justify-center gap-1 ${
                  i > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <span>{item || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
