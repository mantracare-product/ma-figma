import React, { useState } from "react";
import {
  X,
  Send,
  Globe,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
} from "lucide-react";
import { getStoredProcesses, Stage } from "../../../lib/useProcessStore";
import { getWebsiteWidgetConfig } from "../../../lib/websiteWidgetStore";
import { processWebsiteVisitorSubmission } from "../../../lib/websiteChatSimulator";
import { generateProcessStageReply, ProcessSimTurn } from "../../../lib/processChatSimulator";
import { updateProcessCallLogStage } from "../../../lib/processLogsStore";
import { addActivityEntry } from "../../../lib/activityLog";
import { syncTestMessagesToInbox } from "../../../lib/testConversationSync";
import { toast } from "sonner";

interface TestWebsiteChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TestWebsiteChatDrawer({
  isOpen,
  onClose,
}: TestWebsiteChatDrawerProps) {
  const processes = getStoredProcesses();
  const widgetConfig = getWebsiteWidgetConfig();

  // Widget Simulator Flow Step: "inbound" -> "form" -> "chat"
  const [step, setStep] = useState<"inbound" | "form" | "chat">("inbound");

  // Inbound message typed before form opens
  const [inboundMsg, setInboundMsg] = useState("");
  const [initialVisitorMessage, setInitialVisitorMessage] = useState("");

  // Intake Form State (Empty by default)
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState(
    widgetConfig.defaultProcessId || (processes[0]?.id ?? "1")
  );

  // Active Simulation State
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [targetProcessName, setTargetProcessName] = useState("");
  const [turns, setTurns] = useState<ProcessSimTurn[]>([]);
  const [inputMsg, setInputMsg] = useState("");

  if (!isOpen) return null;

  // Step 1: User sends initial inbound message -> trigger Greeting + Empty Form
  const handleSendInitialInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundMsg.trim()) return;

    const firstMsg = inboundMsg.trim();
    setInitialVisitorMessage(firstMsg);
    setInboundMsg("");
    setStep("form");
  };

  // Step 2: User fills empty form and submits -> start live conversation
  const handleStartSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    const reqLabel = widgetConfig.processLabelMap[selectedProcessId];
    const result = processWebsiteVisitorSubmission({
      name: visitorName,
      email: visitorEmail,
      phone: visitorPhone,
      processId: selectedProcessId,
      firstMessage: initialVisitorMessage || "Hello",
      requirementLabel: reqLabel,
    });

    if (!result) {
      toast.error("Failed to initialize test conversation.");
      return;
    }

    const proc = processes.find((p) => p.id === selectedProcessId) || processes[0];
    const initialStageObj = proc.stages.find((s) => s.name === result.stageName) || proc.stages[0];

    setActiveClientId(result.clientId);
    setTargetProcessName(proc.name);
    setCurrentStage(initialStageObj);

    const initialTurns: ProcessSimTurn[] = [
      { role: "contact", text: initialVisitorMessage || "Hello" },
      {
        role: "ai",
        text: result.botReply,
        matchedReason: "Initial Stage Welcome Automation",
        header: result.header,
        footerText: result.footerText,
        buttons: result.buttons,
      },
    ];
    setTurns(initialTurns);
    setStep("chat");

    toast.success(`Simulation started for ${visitorName}! Synced to Website Inbox.`);
  };

  // Step 3: Live chat reply handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !currentStage || !activeClientId) return;

    const userText = inputMsg.trim();
    setInputMsg("");

    const updatedTurns = [...turns, { role: "contact" as const, text: userText }];
    setTurns(updatedTurns);

    const workflowSteps = (currentStage as any).workflowSteps ?? [];
    const previousTurns = updatedTurns.slice(0, -1);
    const result = generateProcessStageReply(currentStage, workflowSteps, userText, previousTurns, "website");

    let nextStageObj = currentStage;
    if (result.newStageName) {
      const proc = processes.find((p) => p.name === targetProcessName);
      if (proc) {
        const found = proc.stages.find((s) => s.name === result.newStageName);
        if (found) {
          nextStageObj = found;
          setCurrentStage(found);
          updateProcessCallLogStage(activeClientId, targetProcessName, found.name);
          addActivityEntry({
            clientId: activeClientId,
            processId: proc.id,
            processName: targetProcessName,
            type: "stage_update",
            refId: `website-test-stage-${Date.now()}`,
            status: "success",
            details: {
              primary: `Moved to stage: ${found.name}`,
              secondary: "via Website Test Bot",
            },
          });
        }
      }
    }

    const botTurn: ProcessSimTurn = {
      role: "ai",
      text: result.text,
      matchedReason: result.matchedReason,
      header: result.header,
      footerText: result.footerText,
      buttons: result.buttons,
    };

    const finalTurns = [...updatedTurns, botTurn];
    setTurns(finalTurns);

    syncTestMessagesToInbox({
      clientId: activeClientId,
      contactName: visitorName,
      phoneNumber: visitorPhone || "+1 (555) 345-6789",
      inboxNumber: "Website Chat Widget",
      channel: "website",
      messages: [
        { text: userText, sender: "contact" },
        {
          text: result.text,
          sender: "me",
          origin: result.firedAutomation ? "template" : "bot",
          header: result.header,
          footerText: result.footerText,
          buttons: result.buttons,
        },
      ],
    });

    if (result.whatsappOutbound || (result.firedAutomation && result.firedAutomation.stepKey === "whatsapp")) {
      const waPayload = result.whatsappOutbound || { text: result.text, templateName: undefined, header: result.header, footerText: result.footerText, buttons: result.buttons };
      syncTestMessagesToInbox({
        clientId: activeClientId,
        contactName: visitorName,
        phoneNumber: visitorPhone || "+1 (555) 345-6789",
        inboxNumber: "+1 (555) 234-5678",
        channel: "whatsapp",
        messages: [
          {
            text: waPayload.text,
            sender: "me",
            origin: "template",
            header: waPayload.header,
            footerText: waPayload.footerText,
            buttons: waPayload.buttons,
          },
        ],
      });

      addActivityEntry({
        clientId: activeClientId,
        processId: selectedProcessId || "1",
        processName: targetProcessName,
        type: "whatsapp",
        refId: `wa-out-${Date.now()}`,
        status: "success",
        direction: "outbound",
        details: {
          primary: result.firedAutomation?.stepName || "WhatsApp Message Triggered",
          secondary: waPayload.templateName ? `Template: ${waPayload.templateName}` : waPayload.text.slice(0, 80),
        },
      });
    }
  };

  const handleReset = () => {
    setStep("inbound");
    setActiveClientId(null);
    setTurns([]);
    setInputMsg("");
    setInboundMsg("");
    setInitialVisitorMessage("");
    setVisitorName("");
    setVisitorEmail("");
    setVisitorPhone("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose} />

      {/* Side Overlay Container */}
      <div className="relative w-[480px] max-w-full h-full bg-slate-100 flex flex-col border-l border-gray-200 shadow-2xl z-10">
        {/* Drawer Header Bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Website Bot Simulator
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic Website Chat Widget */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-center">
          <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-[640px] max-h-full">
            {/* Widget Top Header */}
            <div
              className="p-4 flex items-center justify-between text-white shadow-xs"
              style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {widgetConfig.botName || "MantraAssist Support"}
                  </h4>
                  <span className="text-[10px] text-white/80">Online · Powered by MantraAssist</span>
                </div>
              </div>

              {step !== "inbound" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Widget Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
              {step === "inbound" && (
                <>
                  {/* Step 1: Show initial bot prompt before user sends message */}
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5" }}
                    >
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className="p-3 rounded-2xl rounded-tl-xs text-xs bg-white text-gray-800 border border-gray-200/80 shadow-2xs max-w-[85%]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {widgetConfig.welcomeMessage || "Hello! Welcome to Mantra Health. How can we assist you today?"}
                    </div>
                  </div>
                  <div className="text-center py-6 text-xs text-gray-400 font-medium">
                    Send any message below to trigger greeting & intake form.
                  </div>
                </>
              )}

              {step === "form" && (
                <>
                  {/* Bot Welcome Bubble */}
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5" }}
                    >
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className="p-3 rounded-2xl rounded-tl-xs text-xs bg-white text-gray-800 border border-gray-200/80 shadow-2xs max-w-[85%]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {widgetConfig.welcomeMessage || "Hello! Welcome to Mantra Health. How can we assist you today?"}
                    </div>
                  </div>

                  {/* Visitor Inbound Message Bubble */}
                  <div className="flex justify-end">
                    <div
                      className="p-3 rounded-2xl rounded-tr-xs text-xs text-white max-w-[85%] shadow-2xs"
                      style={{
                        backgroundColor: widgetConfig.themeColor || "#1E88E5",
                        fontFamily: "Outfit, sans-serif",
                      }}
                    >
                      {initialVisitorMessage}
                    </div>
                  </div>

                  {/* Empty Intake Form embedded inside Widget Bubble */}
                  <form onSubmit={handleStartSimulation} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        <User className="w-3.5 h-3.5 text-purple-600" /> Complete form to start:
                      </span>
                      <span className="text-[10px] text-purple-600 bg-purple-50 font-semibold px-2 py-0.5 rounded-full border border-purple-100">
                        Pre-Chat Intake
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={visitorEmail}
                          onChange={(e) => setVisitorEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={visitorPhone}
                          onChange={(e) => setVisitorPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Requirement / Service Needed *
                      </label>
                      <select
                        value={selectedProcessId}
                        onChange={(e) => setSelectedProcessId(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {processes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {widgetConfig.processLabelMap[p.id] || p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5", fontFamily: "Outfit, sans-serif" }}
                    >
                      <Send className="w-3.5 h-3.5" /> Start Website Chat
                    </button>
                  </form>
                </>
              )}

              {step === "chat" && (
                /* Live Interactive Chat Stream */
                <div className="space-y-3">
                  {/* Visitor Context Badge */}
                  <div className="p-2 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-purple-900 truncate">Visitor: {visitorName}</span>
                    <span className="text-purple-700 font-medium shrink-0">Stage: {currentStage?.name}</span>
                  </div>

                  {turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${turn.role === "contact" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[85%] space-y-1 ${
                          turn.role === "contact"
                            ? "text-white rounded-br-xs shadow-2xs"
                            : "bg-white text-gray-800 rounded-bl-xs border border-gray-200/80 shadow-2xs"
                        }`}
                        style={{
                          backgroundColor: turn.role === "contact" ? widgetConfig.themeColor || "#1E88E5" : undefined,
                          fontFamily: "Outfit, sans-serif",
                        }}
                      >
                        {turn.matchedReason && (
                          <div className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 mb-1 inline-block">
                            Triggered: {turn.matchedReason}
                          </div>
                        )}

                        {turn.header?.text && (
                          <div className="font-bold text-[11px] pb-1 border-b border-gray-200">
                            {turn.header.text}
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{turn.text}</p>

                        {turn.footerText && (
                          <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                            {turn.footerText}
                          </p>
                        )}

                        {turn.buttons && turn.buttons.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {turn.buttons.map((b, bi) => (
                              <span
                                key={bi}
                                className="px-2 py-0.5 bg-white border border-gray-200 text-purple-700 rounded-full text-[10px] font-semibold shadow-2xs"
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget Input Footer */}
            {step === "inbound" && (
              <form onSubmit={handleSendInitialInbound} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={inboundMsg}
                  onChange={(e) => setInboundMsg(e.target.value)}
                  placeholder="Type any message to start..."
                  className="flex-1 text-xs border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
                <button
                  type="submit"
                  className="px-3.5 py-2.5 text-white rounded-xl font-semibold text-xs transition-opacity hover:opacity-90 flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5" }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {step === "chat" && (
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type message as visitor..."
                  className="flex-1 text-xs border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
                <button
                  type="submit"
                  className="px-3.5 py-2.5 text-white rounded-xl font-semibold text-xs transition-opacity hover:opacity-90 flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: widgetConfig.themeColor || "#1E88E5" }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
