import React, { useState } from "react";
import { X } from "lucide-react";
import { getStoredWhatsAppNumbers } from "../../../lib/useWhatsAppNumbers";
import { resolveStageForNumber } from "../../../lib/useStageNumberRouting";
import { getClientList } from "../../../lib/getClientList";
import {
  findClientByPhone,
  createClientWithProcessStage,
  setClientProcessStage,
} from "../../../lib/clientProcessState";
import { generateProcessStageReply, ProcessSimTurn } from "../../../lib/processChatSimulator";
import { syncTestMessagesToInbox } from "../../../lib/testConversationSync";
import { Process, Stage } from "../../pages/Process";
import { WorkflowStep } from "../../types/workflow";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { addActivityEntry } from "../../../lib/activityLog";
import { addProcessCallLog, updateProcessCallLogStage } from "../../../lib/processLogsStore";
import { useInvoices } from "../../context/InvoiceContext";

interface TestProcessChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  processes: Process[];
  getWorkflowStepsForStage: (processId: string, stageId: string) => WorkflowStep[];
}

export default function TestProcessChatDrawer({
  isOpen,
  onClose,
  processes,
  getWorkflowStepsForStage,
}: TestProcessChatDrawerProps) {
  const { createInvoiceFromAppointment, sendInvoice } = useInvoices();
  const [selectedNumber, setSelectedNumber] = useState("");
  const [source, setSource] = useState<"whatsapp" | "sms">("whatsapp");
  const [selectedClientId, setSelectedClientId] = useState<string>(""); // "" = new client
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [transcript, setTranscript] = useState<ProcessSimTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<{ processId: string; stageId: string; stageName: string; processName: string } | null>(null);
  const [resolvedContact, setResolvedContact] = useState<{ name: string; phone: string } | null>(null);

  const numbers = getStoredWhatsAppNumbers().map((n) => n.displayPhoneNumber);
  const clients = getClientList();
  const routing = selectedNumber ? resolveStageForNumber(selectedNumber, source) : null;

  if (!isOpen) return null;

  const handleSend = () => {
    if (!draft.trim() || !selectedNumber) return;
    if (!routing) return;

    let clientId = activeClientId;
    let stageCtx = activeStage;
    let contactName = resolvedContact?.name ?? "";
    let contactPhone = resolvedContact?.phone ?? "";

    const isFirstSessionTurn = !clientId;

    if (!clientId) {
      if (selectedClientId) {
        const existing = clients.find((c) => c.id === selectedClientId);
        clientId = existing?.id ?? null;
        contactName = existing?.name ?? "Unknown Contact";
        contactPhone = (existing as any)?.phoneNumber ?? (existing as any)?.phone ?? "";
        stageCtx = {
          processId: routing.processId,
          stageId: routing.stageId,
          stageName: routing.stageName,
          processName: routing.processName,
        };
      } else {
        contactName = newClientName.trim() || "Simulated Contact";
        contactPhone = newClientPhone.trim() || `+1 (555) 000-${Math.floor(1000 + Math.random() * 9000)}`;
        const created = createClientWithProcessStage(contactName, contactPhone, {
          processId: routing.processId,
          processName: routing.processName,
          stageId: routing.stageId,
          stageName: routing.stageName,
          channel: source,
        });
        clientId = created?.id ?? null;
        stageCtx = {
          processId: routing.processId,
          stageId: routing.stageId,
          stageName: routing.stageName,
          processName: routing.processName,
        };
      }
      setActiveClientId(clientId);
      setActiveStage(stageCtx);
      setResolvedContact({ name: contactName, phone: contactPhone });
    }

    if (!stageCtx) return;

    if (isFirstSessionTurn && clientId) {
      addActivityEntry({
        clientId,
        processId: stageCtx.processId,
        processName: stageCtx.processName,
        type: "process_entry",
        refId: `entry-${Date.now()}`,
        status: "success",
        details: { primary: `Entered ${stageCtx.processName} via ${source}`, secondary: stageCtx.stageName },
      });

      addProcessCallLog({
        clientId,
        clientName: contactName,
        processName: stageCtx.processName,
        stageName: stageCtx.stageName,
        channel: source,
      });
    }

    const freshProcesses = getStoredProcesses();
    const process = freshProcesses.find((p) => p.id === stageCtx!.processId);
    const stage = process?.stages.find((s) => s.id === stageCtx!.stageId);
    if (!process || !stage) return;

    const workflowSteps = (stage as any).workflowSteps ?? [];
    const userTurn: ProcessSimTurn = { role: "contact", text: draft };
    const result = generateProcessStageReply(
      stage,
      workflowSteps,
      draft,
      transcript,
      source,
      {
        createInvoiceFn: createInvoiceFromAppointment,
        sendInvoiceFn: sendInvoice,
        clientContext: {
          id: clientId || "c-1",
          name: contactName || "Simulated Contact",
          phone: contactPhone || "",
        },
      }
    );

    const newTurns: ProcessSimTurn[] = [
      userTurn,
      {
        role: "ai",
        text: result.text,
        matchedReason: result.matchedReason,
        header: result.header,
        footerText: result.footerText,
        buttons: result.buttons,
      },
    ];

    if (result.newStageName) {
      const newStage = process.stages.find((s) => s.name === result.newStageName);
      if (newStage && clientId) {
        setClientProcessStage(clientId, {
          processId: process.id,
          processName: process.name,
          stageId: newStage.id,
          stageName: newStage.name,
        });
        updateProcessCallLogStage(clientId, process.name, newStage.name);
        setActiveStage({ processId: process.id, stageId: newStage.id, stageName: newStage.name, processName: process.name });
        newTurns.push({ role: "system", text: `→ Moved to stage: ${newStage.name}` });

        addActivityEntry({
          clientId,
          processId: process.id,
          processName: process.name,
          type: "stage_update",
          refId: `stage-${Date.now()}`,
          status: "success",
          details: { primary: `Moved to stage: ${newStage.name}`, secondary: `via ${source}` },
        });
      }
    }

    setTranscript((prev) => [...prev, ...newTurns]);
    setDraft("");

    syncTestMessagesToInbox({
      clientId: clientId || undefined,
      contactName,
      phoneNumber: contactPhone,
      inboxNumber: selectedNumber,
      channel: source,
      messages: [
        { text: draft, sender: "contact" },
        {
          text: result.text,
          sender: "me",
          origin: result.firedAutomation
            ? (["whatsapp", "sms", "email"].includes(result.firedAutomation.stepKey) ? "template" : "bot")
            : "bot",
          header: result.header,
          footerText: result.footerText,
          buttons: result.buttons,
        },
      ],
    });

    if (clientId && result.firedAutomation && ["whatsapp", "sms", "email"].includes(result.firedAutomation.stepKey)) {
      addActivityEntry({
        clientId,
        processId: process.id,
        processName: process.name,
        type: result.firedAutomation.stepKey as "whatsapp" | "sms" | "email",
        refId: `msg-${Date.now()}`,
        status: "success",
        direction: "outbound",
        details: { primary: result.firedAutomation.stepName, secondary: result.text.slice(0, 80) },
      });
    }
  };

  return (
    <div
      className="fixed top-0 left-0 h-full w-[420px] bg-white z-50 flex flex-col border-r border-gray-200"
      style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.12)" }}
    >
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Test Process Conversation
        </h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-gray-200 flex-shrink-0">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Number</label>
          <select
            value={selectedNumber}
            onChange={(e) => {
              if (e.target.value === selectedNumber) return;
              setSelectedNumber(e.target.value);
              setActiveClientId(null);
              setActiveStage(null);
              setResolvedContact(null);
              setTranscript([]);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Select a number...</option>
            {numbers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Source</label>
          <div className="flex gap-2">
            {(["whatsapp", "sms"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${source === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {s === "whatsapp" ? "WhatsApp" : "SMS"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => {
              if (e.target.value === selectedClientId) return;
              setSelectedClientId(e.target.value);
              setActiveClientId(null);
              setActiveStage(null);
              setResolvedContact(null);
              setTranscript([]);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">+ New Client (simulate first-time contact)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!selectedClientId && (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Simulated name"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="Simulated phone"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        )}

        {selectedNumber && (
          routing ? (
            <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-blue-700">
              Routes to: <strong>{routing.processName} → {routing.stageName}</strong>
            </div>
          ) : (
            <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-700">
              This number isn't assigned to any stage yet. Assign it under a stage's "Choose the inbound source" first.
            </div>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {transcript.map((turn, i) => {
          const isContact = turn.role === "contact";
          const isSystem = turn.role === "system";

          if (isSystem) {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs italic bg-gray-100 text-gray-500">
                  {turn.text}
                </div>
              </div>
            );
          }

          return (
            <div key={i} className={`flex ${isContact ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] space-y-1">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isContact
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                  }`}
                >
                  {turn.header?.type && turn.header.type !== "none" && (
                    <div className="mb-1">
                      {turn.header.type === "text" && turn.header.text && (
                        <p className="font-bold text-sm leading-tight">{turn.header.text}</p>
                      )}
                      {turn.header.type === "image" && (
                        <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 mb-1">
                          Image{turn.header.fileName ? `: ${turn.header.fileName}` : ""}
                        </div>
                      )}
                      {turn.header.type === "video" && (
                        <div className="w-full h-20 bg-gray-900 rounded flex items-center justify-center text-xs text-white mb-1">
                          Video{turn.header.fileName ? `: ${turn.header.fileName}` : ""}
                        </div>
                      )}
                      {turn.header.type === "document" && (
                        <div className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1 text-xs text-gray-700 mb-1">
                          📄 {turn.header.fileName || "document"}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>

                  {turn.footerText && (
                    <p className="text-xs text-gray-400 mt-1">{turn.footerText}</p>
                  )}
                </div>

                {turn.buttons && turn.buttons.length > 0 && (
                  <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-hidden">
                    {turn.buttons.map((btn, bi) => (
                      <button
                        key={bi}
                        type="button"
                        onClick={() => setDraft(btn.label)}
                        className={`w-full px-3 py-2 text-xs font-semibold text-center text-blue-600 hover:bg-blue-50 transition-colors ${
                          bi > 0 ? "border-t border-gray-100" : ""
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={!selectedNumber || !routing}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!selectedNumber || !routing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
