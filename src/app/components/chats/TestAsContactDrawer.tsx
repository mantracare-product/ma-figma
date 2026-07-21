import React, { useState, useRef, useEffect } from "react";
import { X, Send, RotateCcw, FlaskConical, Clock } from "lucide-react";
import { Bot } from "./ChatbotTab";
import {
  ConversationShape,
  advanceBotForInboundMessage,
} from "../../../lib/conversationBotRuntime";
import { generateId } from "../../../lib/ids";

interface TestAsContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationShape | null;
  bot: Bot | undefined;
  onUpdateConversation: (updated: ConversationShape) => void;
}

export default function TestAsContactDrawer({
  isOpen,
  onClose,
  conversation,
  bot,
  onUpdateConversation,
}: TestAsContactDrawerProps) {
  const [input, setInput] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [simulatingDelay, setSimulatingDelay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages, simulatingDelay]);

  if (!isOpen || !conversation) return null;

  /** Helper: map a RuntimeMessage to a ConversationShape message row */
  const makeMsg = (m: {
    text: string;
    sender: "contact" | "me";
    origin?: string;
    buttons?: Array<{ label: string; nextNodeId: string | null; actionType?: string; actionValue?: string }>;
  }): ConversationShape["messages"][number] => ({
    id: generateId("msg"),
    text: m.text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sender: m.sender,
    origin: m.origin as ConversationShape["messages"][number]["origin"],
    buttons: m.buttons,
  });

  const handleSendMessage = async (
    textToSend?: string,
    nextNodeId?: string | null,
    actionType?: string,
    actionValue?: string,
  ) => {
    const text = (textToSend || input).trim();
    if (!text || simulatingDelay) return;
    if (!textToSend) setInput("");

    // 1. Append contact message
    const contactMsg = makeMsg({ text, sender: "contact", origin: "human" });
    contactMsg.status = "delivered";

    const updatedMessages = [...conversation.messages, contactMsg];
    let currentConvo: ConversationShape = {
      ...conversation,
      messages: updatedMessages,
      lastMessage: text,
      timestamp: "Just now",
      unreadCount: (conversation.unreadCount || 0) + 1,
    };
    onUpdateConversation(currentConvo);

    // 2. Call the flow engine — passes nextNodeId so button taps navigate correctly
    const advanceResult = advanceBotForInboundMessage(
      currentConvo,
      bot,
      text,
      nextNodeId,
      actionType,
      actionValue,
    );

    // 3. Append initial bot output messages (may include a delay chip)
    const initialBotMsgs = advanceResult.newMessages.map(makeMsg);
    let finalMessages = [...currentConvo.messages, ...initialBotMsgs];

    let finalConvo: ConversationShape = {
      ...currentConvo,
      messages: finalMessages,
      lastMessage: initialBotMsgs.length > 0 ? initialBotMsgs[initialBotMsgs.length - 1].text : text,
      timestamp: "Just now",
      botRuntime: advanceResult.botRuntimePatch || currentConvo.botRuntime,
      assignedPersonId: advanceResult.assignedPersonIdPatch !== undefined
        ? advanceResult.assignedPersonIdPatch
        : currentConvo.assignedPersonId,
      botStatus: advanceResult.botStatusPatch !== undefined
        ? advanceResult.botStatusPatch
        : currentConvo.botStatus,
      assignedBotId: advanceResult.assignedBotIdPatch !== undefined
        ? advanceResult.assignedBotIdPatch
        : currentConvo.assignedBotId,
    };
    onUpdateConversation(finalConvo);

    // 4. Handle time-delay node: wait, then append post-delay messages
    if (advanceResult.delayMs && advanceResult.postDelayMessages?.length) {
      setSimulatingDelay(true);
      const clampedDelay = Math.min(advanceResult.delayMs, 3000);
      await new Promise(r => setTimeout(r, clampedDelay));
      setSimulatingDelay(false);

      const postDelayMsgs = advanceResult.postDelayMessages.map(makeMsg);
      finalMessages = [...finalConvo.messages, ...postDelayMsgs];
      const lastPost = postDelayMsgs[postDelayMsgs.length - 1];

      finalConvo = {
        ...finalConvo,
        messages: finalMessages,
        lastMessage: lastPost?.text ?? finalConvo.lastMessage,
        botRuntime: advanceResult.postDelayBotRuntimePatch || finalConvo.botRuntime,
      };
      onUpdateConversation(finalConvo);
    }
  };

  /** Called when the user taps a WhatsApp-style button */
  const handleButtonClick = (
    btnLabel: string,
    nextNodeId: string | null,
    actionType?: string,
    actionValue?: string,
  ) => {
    handleSendMessage(btnLabel, nextNodeId, actionType, actionValue);
  };

  const handleResetConversation = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    const resetConvo: ConversationShape = {
      ...conversation,
      messages: [],
      lastMessage: "Conversation reset by tester",
      timestamp: "Just now",
      botRuntime: { currentNodeId: null, awaitingFreeText: false, pendingHandoffNodeId: null },
    };
    onUpdateConversation(resetConvo);
    setConfirmReset(false);
  };

  // Index of the last bot (non-system) message — only those buttons are interactive
  const lastBotMsgIdx = conversation.messages.reduce<number>(
    (last, m, i) => (m.sender === "me" && m.origin !== "system" ? i : last),
    -1,
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Left Drawer */}
      <div className="relative w-full max-w-md bg-background border-r border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">

        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-foreground">Contact Simulator</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-600 font-medium">
                  DEV
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Testing as: <strong className="text-foreground">{conversation.contactName}</strong>{" "}
                ({conversation.channel})
                {bot && <span className="ml-1 text-purple-600">· {bot.name}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetConversation}
              title={confirmReset ? "Click again to confirm reset" : "Reset conversation history"}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                confirmReset
                  ? "bg-destructive/10 text-destructive font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {confirmReset && <span>Confirm?</span>}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message View Area */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#E5DDD5]/20 dark:bg-muted/10">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <FlaskConical className="w-8 h-8 mx-auto opacity-40 text-purple-500" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs">
                Type a message below to test how the bot responds to{" "}
                {conversation.contactName}.
              </p>
            </div>
          ) : (
            conversation.messages.map((msg, idx) => {
              // System chips (assigned, delay, etc.)
              if (msg.origin === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-center max-w-[85%]">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isContact = msg.sender === "contact";
              const isLatestBot = !isContact && idx === lastBotMsgIdx;
              const hasBtns = !isContact && msg.buttons && msg.buttons.length > 0;

              return (
                <div key={msg.id} className={`flex flex-col ${isContact ? "items-end" : "items-start"}`}>
                  <div className="max-w-[82%]">
                    {/* Message bubble */}
                    <div
                      className={`px-3.5 py-2.5 text-xs shadow-2xs space-y-1.5 ${
                        hasBtns
                          ? "rounded-t-2xl rounded-bl-2xl"
                          : "rounded-2xl"
                      } ${
                        isContact
                          ? "bg-[#DCF8C6] dark:bg-emerald-800 text-slate-900 dark:text-white rounded-tr-xs"
                          : "bg-background border border-border text-foreground rounded-tl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div
                        className={`flex items-center justify-between text-[10px] gap-2 ${
                          isContact
                            ? "text-emerald-800/70 dark:text-emerald-200/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span>{msg.origin ? `[${msg.origin}]` : ""}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* WhatsApp-style tappable buttons — only active on the latest bot message */}
                    {hasBtns && (
                      <div
                        className={`border border-t-0 border-border rounded-b-xl overflow-hidden bg-background ${
                          !isLatestBot || simulatingDelay ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {msg.buttons!.map((btn, bi) => {
                          const isTerminal = btn.actionType && btn.actionType !== "quick_reply";
                          return (
                            <button
                              key={bi}
                              type="button"
                              disabled={!isLatestBot || simulatingDelay}
                              onClick={() =>
                                handleButtonClick(
                                  btn.label,
                                  btn.nextNodeId,
                                  btn.actionType,
                                  btn.actionValue,
                                )
                              }
                              className={`w-full px-3 py-2 text-xs font-semibold text-center text-blue-600 transition-colors flex items-center justify-center gap-1 ${
                                bi > 0 ? "border-t border-border" : ""
                              } ${
                                isLatestBot && !simulatingDelay
                                  ? "hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                  : "cursor-not-allowed"
                              }`}
                            >
                              {btn.label}
                              {isTerminal && (
                                <span className="text-[9px] text-muted-foreground ml-1">↗</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {simulatingDelay && (
            <div className="flex justify-center my-2 animate-pulse">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Bot is typing (simulating delay)...
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-background">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Type as ${conversation.contactName}...`}
              disabled={simulatingDelay}
              className="flex-1 px-4 py-2.5 bg-input-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || simulatingDelay}
              className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
