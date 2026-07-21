import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw, AlertTriangle, Clock } from "lucide-react";
import { Bot } from "./ChatbotTab";
import { TestChatTurn, resolveTestVariables } from "../../../lib/chatbotTestReply";
import {
  executeEntryRouter,
  executeFlowNode,
  FlowStepResult,
  answerFromKnowledgeBase,
  getDelayMs
} from "../../../lib/chatbotFlowEngine";
import { WhatsappTemplate } from "../../pages/Chats";
import { useBusinessHours } from "../../../hooks/useBusinessHours";
import { getLiveFieldSources } from "../process/VariablePickerButton";

interface BotTestChatPanelProps {
  bot: Bot;
  employees: { id: string; name: string }[];
  templates: WhatsappTemplate[];
}

const MAX_TEST_MESSAGES = 20;
const MAX_REAL_DELAY_MS = 3000; // clamp simulated waits to 3 s in test mode

function resolveFieldLabel(fieldKey: string): string {
  try {
    const sources = getLiveFieldSources();
    for (const source of sources) {
      const field = source.fields.find((f: any) => f.value === fieldKey);
      if (field) return `${source.label} › ${field.label}`;
    }
  } catch {}
  return fieldKey;
}

export default function BotTestChatPanel({ bot, employees, templates }: BotTestChatPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [turns, setTurns] = useState<TestChatTurn[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [awaitingFreeText, setAwaitingFreeText] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [inputLocked, setInputLocked] = useState(false); // locked during delay simulation
  const [withinHours, setWithinHours] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // resetCounter drives the outbound auto-initiation useEffect
  const [resetCounter, setResetCounter] = useState(0);
  // activeBot starts as the prop bot, but switches when a handoff is triggered
  const [activeBot, setActiveBot] = useState<Bot>(bot);
  // track if the current node is a humanHandoff node (for Yes/No branch routing)
  const [pendingHandoffNodeId, setPendingHandoffNodeId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const businessHours = useBusinessHours();
  const userTurnCount = turns.filter(t => t.role === "user").length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEntryDirection = useCallback((): "inbound" | "outbound" => {
    const entryNode = activeBot.flow?.nodes.find(n => n.type === "entryRouter");
    return (entryNode?.data?.direction ?? "inbound") as "inbound" | "outbound";
  }, [activeBot]);

  /**
   * If the step result has a delayMs, simulate the wait (clamped to MAX_REAL_DELAY_MS),
   * show a system chip, lock input, wait, then unlock and continue to the next node.
   */
  async function handleDelay(result: FlowStepResult, updatedTurns: TestChatTurn[]): Promise<TestChatTurn[]> {
    if (!result.delayMs) return updatedTurns;

    const realWait = Math.min(result.delayMs, MAX_REAL_DELAY_MS);
    const durationLabel = result.messageText.replace("[Flow Action: ", "").replace("]", "");

    const delayChip: TestChatTurn = {
      role: "system",
      text: `⏱ Simulating delay: ${durationLabel} (capped at ${(realWait / 1000).toFixed(1)}s in Test Mode)`
    };
    const withChip = [...updatedTurns, delayChip];
    setTurns(withChip);
    setInputLocked(true);

    await new Promise(r => setTimeout(r, realWait));
    setInputLocked(false);
    return withChip;
  }

  function appendBotResult(result: FlowStepResult, updatedTurns?: TestChatTurn[]) {
    // ── Chatbot handoff detected ──
    if (result.chatbotHandoff?.targetBotId) {
      const targetBotId = result.chatbotHandoff.targetBotId;
      let targetBot: Bot | null = null;
      let targetBotName = "Unknown Bot";
      try {
        const raw = localStorage.getItem("chatbotBots");
        if (raw) {
          const all = JSON.parse(raw) as Bot[];
          const found = all.find(b => b.id === targetBotId);
          if (found) { targetBot = found; targetBotName = found.name; }
        }
      } catch {}

      const handoffChip: TestChatTurn = { role: "system", text: `→ Handed off to "${targetBotName}"` };
      setTurns(prev => {
        const base = updatedTurns ?? prev;
        return [...base, handoffChip];
      });

      if (targetBot) {
        setActiveBot(targetBot);
        // Briefly delay then auto-start the target bot's entry router
        setTimeout(() => {
          setTurns(prev => {
            const withHandoff = [...prev];
            const entryResult = executeEntryRouter(targetBot!, { history: withHandoff });
            if (entryResult) {
              const botTurn: TestChatTurn = {
                role: "bot",
                text: resolveTestVariables(entryResult.messageText, withHandoff, targetBot!),
                buttons: entryResult.buttons
              };
              setCurrentNodeId(entryResult.nodeId);
              setAwaitingFreeText(entryResult.awaitingInput);
              return [...withHandoff, botTurn];
            }
            return withHandoff;
          });
        }, 600);
      } else {
        setCurrentNodeId(null);
        setAwaitingFreeText(false);
      }
      return;
    }

    const base = updatedTurns ?? turns;

    // ── Human handoff node: show the question with Yes/No buttons ──
    if (result.assignHuman !== undefined) {
      // This result came from a humanHandoff node — track it so we can branch on Yes/No
      setPendingHandoffNodeId(result.nodeId);
    } else {
      setPendingHandoffNodeId(null);
    }

    setTurns([...base, {
      role: "bot",
      text: resolveTestVariables(result.messageText, base, activeBot),
      buttons: result.buttons
    }]);
    setCurrentNodeId(result.nodeId);
    setAwaitingFreeText(result.awaitingInput);
  }

  // ── Outbound auto-initiation ──────────────────────────────────────────────
  const initiateOutbound = useCallback(async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 400));
    try {
      const result = executeEntryRouter(activeBot, { history: [] });
      if (result) {
        if (result.delayMs) {
          const withDelay = await handleDelay(result, []);
          // After delay, advance to the next node
          const node = activeBot.flow?.nodes.find(n => n.id === result.nodeId);
          const nextId = node?.connections?.[0]?.toNodeId ?? null;
          if (nextId) {
            const nextResult = executeFlowNode(activeBot, nextId, { history: withDelay });
            if (nextResult) { appendBotResult(nextResult, withDelay); return; }
          }
        } else {
          appendBotResult(result, []);
        }
      } else {
        setTurns([{ role: "system", text: "⚠️ Outbound flow has no outgoing connections from the Entry Point — connect a node to it on the canvas." }]);
      }
    } catch {
      setTurns([{ role: "system", text: "⚠️ Failed to initiate outbound flow." }]);
    } finally {
      setSending(false);
    }
  }, [activeBot]);

  useEffect(() => {
    if (getEntryDirection() === "outbound") {
      initiateOutbound();
    }
  // resetCounter resets turns to [] before this effect fires
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCounter]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setTurns([]);
    setCurrentNodeId(null);
    setAwaitingFreeText(false);
    setError(null);
    setInputLocked(false);
    setPendingHandoffNodeId(null);
    setActiveBot(bot); // reset to original bot on restart
    setResetCounter(c => c + 1);
  };

  // ── Core send function ────────────────────────────────────────────────────
  const send = async (overrideText?: string, resolvedNextNodeId?: string | null, btnActionType?: string, btnActionValue?: string) => {
    const text = overrideText ?? input;
    if (!text.trim() || sending || inputLocked) return;
    if (userTurnCount >= MAX_TEST_MESSAGES) {
      setError(`Test limit reached (${MAX_TEST_MESSAGES} messages). Reset to keep testing.`);
      return;
    }

    const userTurn: TestChatTurn = {
      role: "user",
      text: text.trim(),
      nodeId: currentNodeId ?? undefined
    };

    let updatedTurns: TestChatTurn[] = [...turns, userTurn];
    setTurns(updatedTurns);
    setInput("");
    setSending(true);
    setError(null);

    await new Promise(r => setTimeout(r, 200));

    try {
      // ── HUMAN HANDOFF BRANCH: Yes / No routing ────────────────────────
      if (pendingHandoffNodeId) {
        const handoffNode = activeBot.flow?.nodes.find(n => n.id === pendingHandoffNodeId);
        if (handoffNode?.type === "humanHandoff") {
          setPendingHandoffNodeId(null);

          if (text.trim().toLowerCase() === "yes") {
            // Yes → assign to human
            const personId = handoffNode.data?.yesPersonId || "";
            const person = employees.find(e => e.id === personId);
            const chip: TestChatTurn = {
              role: "system",
              text: person
                ? `✅ Conversation assigned to ${person.name}`
                : "✅ Conversation assigned to a human agent"
            };
            setTurns([...updatedTurns, chip]);
            setCurrentNodeId(null);
            setAwaitingFreeText(false);
            return;
          } else {
            // No → execute handoffNoResponse (message / template / chatbot)
            const noResponse = handoffNode.data?.noResponse;
            if (noResponse) {
              if (noResponse.type === "message") {
                const botTurn: TestChatTurn = {
                  role: "bot",
                  text: resolveTestVariables(noResponse.text || "Okay, we'll continue here.", updatedTurns, activeBot)
                };
                setTurns([...updatedTurns, botTurn]);
                setCurrentNodeId(null);
                setAwaitingFreeText(false);
                return;
              }
              if (noResponse.type === "template") {
                const chip: TestChatTurn = {
                  role: "system",
                  text: `[Would send template: ${noResponse.templateId || "Unnamed template"}]`
                };
                setTurns([...updatedTurns, chip]);
                setCurrentNodeId(null);
                setAwaitingFreeText(false);
                return;
              }
              if (noResponse.type === "chatbot" && noResponse.targetBotId) {
                const fakeResult: FlowStepResult = {
                  nodeId: handoffNode.id,
                  messageText: "",
                  awaitingInput: false,
                  chatbotHandoff: { targetBotId: noResponse.targetBotId }
                };
                appendBotResult(fakeResult, updatedTurns);
                return;
              }
            }
            // fallback no-response
            const botTurn: TestChatTurn = { role: "bot", text: "Alright, let's continue then." };
            setTurns([...updatedTurns, botTurn]);
            setCurrentNodeId(null);
            setAwaitingFreeText(false);
            return;
          }
        }
      }

      // ── TERMINAL BUTTON ACTION (call / url / email) ─────────────────
      if (btnActionType && btnActionType !== "quick_reply") {
        const labels: Record<string, string> = {
          call: `📞 Dialing ${btnActionValue || "…"}`,
          url: `🌐 Opening ${btnActionValue || "…"}`,
          email: `✉️ Composing email to ${btnActionValue || "…"}`,
        };
        const chip: TestChatTurn = {
          role: "system",
          text: labels[btnActionType] ?? `[${btnActionType}: ${btnActionValue}]`
        };
        setTurns([...updatedTurns, chip]);
        setCurrentNodeId(null);
        setAwaitingFreeText(false);
        return;
      }

      // ── FIRST INBOUND MESSAGE: entry router hands off to first connected node ──
      if (turns.length === 0) {
        const result = executeEntryRouter(activeBot, { history: updatedTurns });
        if (result) {
          if (result.delayMs) {
            const withDelay = await handleDelay(result, updatedTurns);
            const node = activeBot.flow?.nodes.find(n => n.id === result.nodeId);
            const nextId = node?.connections?.[0]?.toNodeId ?? null;
            if (nextId) {
              const nextResult = executeFlowNode(activeBot, nextId, { history: withDelay });
              if (nextResult) { appendBotResult(nextResult, withDelay); return; }
            }
          } else {
            appendBotResult(result, updatedTurns);
          }
        } else {
          setTurns(prev => [...prev, {
            role: "system",
            text: "⚠️ Entry point has no outgoing connections — connect a node to it on the canvas."
          }]);
        }
        return;
      }

      // ── BUTTON TAP: navigate to the resolved node ──────────────────────────
      if (resolvedNextNodeId !== undefined) {
        if (resolvedNextNodeId === null) {
          setTurns(prev => [...prev, {
            role: "system",
            text: "⚠️ This branch isn't connected to anything yet — add a node after it on the canvas."
          }]);
          return;
        }
        const result = executeFlowNode(activeBot, resolvedNextNodeId, { history: updatedTurns });
        if (result) {
          if (result.delayMs) {
            const withDelay = await handleDelay(result, updatedTurns);
            const node = activeBot.flow?.nodes.find(n => n.id === result.nodeId);
            const nextId = node?.connections?.[0]?.toNodeId ?? null;
            if (nextId) {
              const nextResult = executeFlowNode(activeBot, nextId, { history: withDelay });
              if (nextResult) { appendBotResult(nextResult, withDelay); return; }
            }
          } else {
            appendBotResult(result, updatedTurns);
          }
        } else {
          setTurns(prev => [...prev, {
            role: "system",
            text: "⚠️ Reached a dead end — this node isn't connected to anything."
          }]);
        }
        return;
      }

      // ── FREE TEXT: show save-response chip, then advance from current node ──
      if (currentNodeId) {
        const node = activeBot.flow?.nodes.find(n => n.id === currentNodeId);

        if (node?.type === "question" && node.data?.saveResponseField) {
          const fieldLabel = resolveFieldLabel(node.data.saveResponseField);
          const chipTurn: TestChatTurn = { role: "system", text: `📝 Would save response to: ${fieldLabel}` };
          setTurns(prev => [...prev, chipTurn]);
          updatedTurns = [...updatedTurns, chipTurn];
          // TODO(backend): wire saveResponseField to write user's answer to the record field when the flow executes live.
        }

        const nextId = node?.connections?.[0]?.toNodeId ?? null;
        if (nextId) {
          const result = executeFlowNode(activeBot, nextId, { history: updatedTurns });
          if (result) {
            if (result.delayMs) {
              const withDelay = await handleDelay(result, updatedTurns);
              const nextNode = activeBot.flow?.nodes.find(n => n.id === result.nodeId);
              const nextNextId = nextNode?.connections?.[0]?.toNodeId ?? null;
              if (nextNextId) {
                const nextResult = executeFlowNode(activeBot, nextNextId, { history: withDelay });
                if (nextResult) { appendBotResult(nextResult, withDelay); return; }
              }
            } else {
              appendBotResult(result, updatedTurns);
              return;
            }
          }
        }
      }

      // ── KNOWLEDGE BASE FALLBACK ──────────────────────────────────────
      const kbAnswer = answerFromKnowledgeBase(activeBot, text);
      if (kbAnswer) {
        setTurns(prev => [...prev, { role: "bot", text: resolveTestVariables(kbAnswer, updatedTurns, activeBot) }]);
        return;
      }

      // ── FALLBACK MESSAGE ──────────────────────────────────────────
      setTurns(prev => [...prev, {
        role: "bot",
        text: resolveTestVariables(activeBot.fallbackMessage || "I'm not sure how to help with that yet.", updatedTurns, activeBot)
      }]);
    } catch {
      setTurns(prev => [...prev, { role: "system", text: "⚠️ Couldn't generate a reply — try again." }]);
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
  const direction = getEntryDirection();
  const isDisabled = sending || inputLocked;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white">
      {/* Direction badge */}
      <div className={`px-4 py-1.5 border-b flex items-center gap-2 flex-shrink-0 ${direction === "outbound" ? "bg-violet-50 border-violet-100" : "bg-emerald-50 border-emerald-100"}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${direction === "outbound" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
          {direction === "outbound" ? "⚡ Outbound" : "📨 Inbound"}
        </span>
        <span className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
          {direction === "outbound" ? "Bot initiates — simulating auto-trigger" : "Waiting for client message"}
        </span>
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
              <button type="button" onClick={() => setWithinHours(true)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${withinHours ? "bg-amber-600 text-white font-medium" : "text-amber-700 hover:bg-amber-100/50"}`}>
                Within hours
              </button>
              <button type="button" onClick={() => setWithinHours(false)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${!withinHours ? "bg-amber-600 text-white font-medium" : "text-amber-700 hover:bg-amber-100/50"}`}>
                Outside hours
              </button>
            </div>
          )}
        </>
      )}

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/30">
        {turns.length === 0 && !sending ? (
          <div className="flex h-full items-center justify-center px-6 py-8">
            <p className="text-xs text-gray-400 text-center leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              {direction === "outbound"
                ? "Outbound flow starting automatically…"
                : "Type a message below to simulate an inbound contact — the flow will respond exactly as it would on a real channel."}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {turns.map((t, i) => {
              const isLatestBotTurn = t.role === "bot" && i === turns.length - 1;
              const isSystemInfo = t.role === "system" && t.text.startsWith("📝");
              const isDelayChip = t.role === "system" && t.text.startsWith("⏱");
              const isHandoffChip = t.role === "system" && (t.text.startsWith("→") || t.text.startsWith("✅") || t.text.startsWith("📞") || t.text.startsWith("🌐") || t.text.startsWith("✉️"));
              return (
                <div key={i} className="space-y-1">
                  <div className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%]">
                      <div
                        className={`rounded-xl shadow-sm px-3.5 py-2 text-sm leading-relaxed ${
                          t.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : t.role === "system"
                            ? isSystemInfo
                              ? "bg-green-50 border border-green-200 text-green-800 text-xs font-medium"
                              : isDelayChip
                              ? "bg-slate-100 border border-slate-300 text-slate-600 text-xs font-medium flex items-center gap-1.5"
                              : isHandoffChip
                              ? "bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium"
                              : "bg-slate-100 border border-slate-200 text-slate-700 italic text-xs"
                            : "bg-white rounded-tl-none text-gray-800 border border-gray-100"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {isDelayChip && <Clock className="w-3 h-3 shrink-0 text-slate-500" />}
                        {t.text}
                      </div>

                      {/* WhatsApp-style buttons */}
                      {t.buttons && t.buttons.length > 0 && (
                        <div className={`bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-hidden mt-0.5 ${!isLatestBotTurn ? "opacity-50" : ""}`}>
                          {t.buttons.map((btn, bi) => {
                            const isTerminal = btn.actionType && btn.actionType !== "quick_reply";
                            return (
                              <button
                                key={bi}
                                type="button"
                                disabled={!isLatestBotTurn || isDisabled}
                                onClick={() => send(btn.label, btn.nextNodeId, btn.actionType, (btn as any).actionValue)}
                                className={`w-full px-3 py-2 text-xs font-semibold text-center text-blue-600 transition-colors flex items-center justify-center gap-1 ${bi > 0 ? "border-t border-gray-100" : ""} ${isLatestBotTurn && !isDisabled ? "hover:bg-blue-50 cursor-pointer" : "cursor-not-allowed"}`}
                              >
                                {btn.label}
                                {isTerminal && <span className="text-[9px] text-gray-400 ml-1">↗</span>}
                              </button>
                            );
                          })}
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

      {/* Input locked banner */}
      {inputLocked && (
        <div className="px-4 py-2 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 flex-shrink-0 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          <Clock className="w-3.5 h-3.5 animate-spin" />
          Simulating delay — input locked…
        </div>
      )}

      {/* Text input — hidden for outbound until flow has started */}
      <div className="bg-white px-4 py-3 flex items-center gap-2 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={reset}
          title="Reset conversation"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); send(undefined, undefined); }
          }}
          placeholder={
            inputLocked
              ? "Waiting for delay…"
              : awaitingFreeText
              ? "Type your free-text response..."
              : direction === "outbound" && turns.length === 0
              ? "Flow initiating…"
              : "Type as a test customer…"
          }
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isDisabled || (direction === "outbound" && turns.length === 0 && !error)}
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
        <button
          type="button"
          onClick={() => send(undefined, undefined)}
          disabled={isDisabled || !input.trim()}
          className="w-9 h-9 bg-blue-600 disabled:opacity-40 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
