import React, { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, AlertTriangle, Lock } from "lucide-react";
import { Bot } from "./ChatbotTab";
import { TestChatTurn, resolveTestVariables } from "../../../lib/chatbotTestReply";
import { executeEntryRouter, executeFlowNode, FlowStepResult, FlowExecutionContext, answerFromKnowledgeBase } from "../../../lib/chatbotFlowEngine";
import { WhatsappTemplate } from "../../pages/Chats";
import { useBusinessHours } from "../../../hooks/useBusinessHours";

interface BotTestChatPanelProps {
  bot: Bot; // pass the live, in-editor draft — not a persisted copy
  employees: { id: string; name: string }[];
  templates: WhatsappTemplate[];
}

const MAX_TEST_MESSAGES = 20;

export default function BotTestChatPanel({ bot, employees, templates }: BotTestChatPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [turns, setTurns] = useState<TestChatTurn[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [awaitingFreeText, setAwaitingFreeText] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [withinHours, setWithinHours] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedIdentity, setSimulatedIdentity] = useState<FlowExecutionContext["simulatedIdentity"]>("new_contact");

  const scrollRef = useRef<HTMLDivElement>(null);
  const businessHours = useBusinessHours();
  const userTurnCount = turns.filter(t => t.role === "user").length;
  const identityLocked = turns.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setTurns([]);
    setCurrentNodeId(null);
    setAwaitingFreeText(false);
    setError(null);
  };

  // ── Append helper ─────────────────────────────────────────────────────────
  function appendBotResult(result: FlowStepResult) {
    setTurns(prev => [...prev, {
      role: "bot",
      text: resolveTestVariables(result.messageText),
      buttons: result.buttons
    }]);
    setCurrentNodeId(result.nodeId);
    setAwaitingFreeText(result.awaitingInput);
  }

  // ── Core send function ────────────────────────────────────────────────────
  const send = async (overrideText?: string, resolvedNextNodeId?: string | null) => {
    const text = overrideText ?? input;
    if (!text.trim() || sending) return;
    if (userTurnCount >= MAX_TEST_MESSAGES) {
      setError(`Test limit reached (${MAX_TEST_MESSAGES} messages). Reset to keep testing.`);
      return;
    }

    const userTurn: TestChatTurn = { role: "user", text: text.trim() };
    setTurns(prev => [...prev, userTurn]);
    setInput("");
    setSending(true);
    setError(null);

    // Small delay for simulation feel
    await new Promise(r => setTimeout(r, 200));

    try {
      // ── FIRST MESSAGE: trigger the entry router ──────────────────────────
      if (turns.length === 0) {
        const ctx: FlowExecutionContext = {
          simulatedIdentity,
          simulatedProcessName: simulatedIdentity === "returning_with_process" ? "Patient Intake" : undefined,
          simulatedStageName: simulatedIdentity === "returning_with_process" ? "Initial Contact" : undefined,
        };
        const result = executeEntryRouter(bot, ctx);
        appendBotResult(result);
        return;
      }

      // ── BUTTON TAP: navigate to the resolved node ──────────────────────
      if (resolvedNextNodeId !== undefined) {
        // Sentinel: re-show the process picker
        if (resolvedNextNodeId === "__process_picker__") {
          const result = executeEntryRouter(bot, { simulatedIdentity: "new_contact" });
          appendBotResult(result);
          return;
        }
        // Sentinel: enroll in a process and continue to next node after entry router
        if (resolvedNextNodeId !== null && resolvedNextNodeId.startsWith("__enroll__")) {
          const processName = resolvedNextNodeId.replace("__enroll__", "");
          setTurns(prev => [
            ...prev,
            { role: "system", text: `✅ Would enroll this contact in "${processName}" at its first stage.` }
          ]);
          const entryNode = bot.flow?.nodes.find(n => n.type === "entryRouter");
          const nextId = entryNode?.connections?.[0]?.toNodeId ?? null;
          if (nextId) {
            const result = executeFlowNode(bot, nextId);
            if (result) {
              appendBotResult(result);
            } else {
              setTurns(prev => [
                ...prev,
                { role: "system", text: "⚠️ No node connected after the entry router yet — nothing further to simulate." }
              ]);
            }
          } else {
            setTurns(prev => [
              ...prev,
              { role: "system", text: "⚠️ No node connected after the entry router yet — nothing further to simulate." }
            ]);
          }
          return;
        }
        // Dead-end button (nextNodeId is null)
        if (resolvedNextNodeId === null) {
          setTurns(prev => [
            ...prev,
            { role: "system", text: "⚠️ This branch isn't connected to anything yet — add a node after it on the canvas." }
          ]);
          return;
        }
        // Real node id — execute it
        const result = executeFlowNode(bot, resolvedNextNodeId);
        if (result) {
          appendBotResult(result);
        } else {
          setTurns(prev => [
            ...prev,
            { role: "system", text: "⚠️ Reached a dead end — this node isn't connected to anything." }
          ]);
        }
        return;
      }

      // ── FREE TEXT: advance from current node ───────────────────────────
      if (currentNodeId) {
        const node = bot.flow?.nodes.find(n => n.id === currentNodeId);
        const nextId = node?.connections?.[0]?.toNodeId ?? null;
        if (nextId) {
          const result = executeFlowNode(bot, nextId);
          if (result) {
            appendBotResult(result);
            return;
          }
        }
      }

      // ── KNOWLEDGE BASE FALLBACK (Precedence: Flow -> KB -> FallbackMessage) ──
      const kbAnswer = answerFromKnowledgeBase(bot, text);
      if (kbAnswer) {
        setTurns(prev => [...prev, { role: "bot", text: resolveTestVariables(kbAnswer) }]);
        return;
      }

      // ── FALLBACK MESSAGE ──
      setTurns(prev => [
        ...prev,
        { role: "bot", text: resolveTestVariables(bot.fallbackMessage || "I'm not sure how to help with that yet.") }
      ]);
    } catch {
      setTurns(prev => [
        ...prev,
        { role: "system", text: "⚠️ Couldn't generate a reply — try again." }
      ]);
    } finally {
      setSending(false);
    }
  };

  // ── Styling helpers ───────────────────────────────────────────────────────
  let counterBg = "bg-gray-100 text-gray-700";
  if (userTurnCount >= 20) {
    counterBg = "bg-red-100 text-red-700 font-bold border border-red-200 animate-pulse";
  } else if (userTurnCount >= 15) {
    counterBg = "bg-amber-100 text-amber-700 font-bold border border-amber-200";
  }

  const isInheritedHours = (bot.businessHoursMode ?? "inherit") === "inherit";
  const orgHoursMissing = bot.businessHoursEnabled && isInheritedHours && !businessHours.configured;

  const IDENTITY_OPTIONS = [
    { key: "new_contact" as const, label: "New contact" },
    { key: "returning_with_process" as const, label: "Returning, in process" },
    { key: "returning_no_process" as const, label: "Returning, no process" },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white">
      {/* simulated-identity toggle */}
      <div className={`border-b px-4 py-2 flex-shrink-0 transition-colors ${identityLocked ? "bg-gray-50/60 border-gray-100" : "bg-slate-50 border-gray-150"}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {identityLocked && <Lock className="w-3 h-3 text-gray-400 shrink-0" />}
          <span className="text-[11px] text-gray-500 font-medium shrink-0">Simulate as:</span>
          {IDENTITY_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              disabled={identityLocked}
              onClick={() => setSimulatedIdentity(opt.key)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${
                simulatedIdentity === opt.key
                  ? identityLocked
                    ? "bg-gray-300 text-gray-600"
                    : "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-200 disabled:hover:bg-transparent"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-gray-400 mt-1 leading-tight">
          {identityLocked
            ? "Locked for this conversation — reset to change."
            : "Locks once you send your first test message."}
        </p>
      </div>

      {/* Business Hours warnings/controls */}
      {bot.businessHoursEnabled && (
        <>
          {orgHoursMissing ? (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-start gap-1.5 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-800 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                Organization business hours not configured — bot will behave as always online.
              </span>
            </div>
          ) : (
            <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-amber-800 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Simulate:</span>
              <button
                type="button"
                onClick={() => setWithinHours(true)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${withinHours ? "bg-amber-600 text-white font-medium" : "text-amber-700 hover:bg-amber-100/50"}`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Within hours
              </button>
              <button
                type="button"
                onClick={() => setWithinHours(false)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${!withinHours ? "bg-amber-600 text-white font-medium" : "text-amber-700 hover:bg-amber-100/50"}`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Outside hours
              </button>
            </div>
          )}
        </>
      )}

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/30">
        {turns.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-8">
            <p className="text-xs text-gray-400 text-center leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              Type a message below to simulate an inbound contact — the entry router will respond exactly as it would on a real channel.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {turns.map((t, i) => {
              const isLatestBotTurn = t.role === "bot" && i === turns.length - 1;
              return (
                <div key={i} className="space-y-1">
                  <div className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%]">
                      <div
                        className={`rounded-xl shadow-sm px-3.5 py-2 text-sm leading-relaxed ${
                          t.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : t.role === "system"
                            ? "bg-slate-100 border border-slate-200 text-slate-700 italic text-xs"
                            : "bg-white rounded-tl-none text-gray-800 border border-gray-100"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {t.text}
                      </div>

                      {/* WhatsApp-style buttons attached directly underneath */}
                      {t.buttons && t.buttons.length > 0 && (
                        <div className={`bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-hidden mt-0.5 ${!isLatestBotTurn ? "opacity-50" : ""}`}>
                          {t.buttons.map((btn, bi) => (
                            <button
                              key={bi}
                              type="button"
                              disabled={!isLatestBotTurn || sending}
                              onClick={() => send(btn.label, btn.nextNodeId)}
                              className={`w-full px-3 py-2 text-xs font-semibold text-center text-blue-600 transition-colors ${bi > 0 ? "border-t border-gray-100" : ""} ${isLatestBotTurn ? "hover:bg-blue-50 cursor-pointer" : "cursor-not-allowed"}`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-xl rounded-tl-none px-4 py-2 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100 flex-shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
          {error}
        </div>
      )}

      {/* Text input */}
      <div className="bg-white px-4 py-3 flex items-center gap-2 border-t border-gray-200 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              send(undefined, undefined);
            }
          }}
          placeholder={
            awaitingFreeText
              ? "Type your free-text response..."
              : "Type as a test customer..."
          }
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
        <button
          type="button"
          onClick={() => send(undefined, undefined)}
          disabled={sending || !input.trim()}
          className="w-9 h-9 bg-blue-600 disabled:opacity-40 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
