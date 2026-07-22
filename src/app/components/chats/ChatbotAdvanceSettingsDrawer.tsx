import React, { useState, useEffect } from "react";
import { X, Clock, AlertTriangle, UserCheck, Bot as BotIcon, FileText, MessageSquare, Globe, Copy, Check } from "lucide-react";
import { Bot, getEffectiveFallbackResponse } from "./ChatbotTab";
import { Campaign, WhatsappTemplate } from "../../pages/Chats";
import { useBusinessHours } from "../../../hooks/useBusinessHours";
import { DynamicResponse, HandoffNoResponse, ButtonAction } from "../../../lib/chatbotTypes";
import ButtonActionEditor from "../shared/ButtonActionEditor";
import { InfoTooltip } from "../help/InfoTooltip";

interface ChatbotAdvanceSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bot: Bot;
  onChange: (patch: Partial<Bot>) => void;
  employees: { id: string; name: string }[];
  campaigns: Campaign[];
  templates: WhatsappTemplate[];
}

function CopySnippetButton({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
    >
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Row({ icon, title, badge, children, defaultOpen }: { icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>{title}</span>
        </div>
        {badge && <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{badge}</span>}
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/30">{children}</div>}
    </div>
  );
}

export default function ChatbotAdvanceSettingsDrawer({ isOpen, onClose, bot, onChange, employees, templates = [] }: ChatbotAdvanceSettingsDrawerProps) {
  const businessHours = useBusinessHours();
  const [availableBots, setAvailableBots] = useState<Bot[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chatbotBots");
      if (raw) {
        const sanitizeBot = (b: Bot): Bot => ({
          ...b,
          channels: (b.channels || []).filter((c) => c !== "sms"),
        });
        setAvailableBots((JSON.parse(raw) as Bot[]).map(sanitizeBot));
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const fallback = getEffectiveFallbackResponse(bot);
  const handoffNo: HandoffNoResponse = bot.handoffNoResponse || { type: "message", text: "No problem! Let me know if you need help with anything else." };

  const updateFallback = (patch: Partial<DynamicResponse>) => {
    onChange({
      fallbackResponse: {
        ...fallback,
        ...patch
      }
    });
  };

  const updateHandoffNo = (patch: Partial<HandoffNoResponse>) => {
    onChange({
      handoffNoResponse: {
        ...handoffNo,
        ...patch
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl" style={{ width: "560px" }}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Advance Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Applies to "{bot.name}" as a whole — not tied to any single flow node.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* 1. Dynamic Fallback Message */}
          <Row icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />} title="Fallback Response" defaultOpen>
            <p className="text-xs text-gray-500">Sent when no flow node matches and Knowledge Base has no answer either.</p>
            
            {/* Segmented Control for Response Type */}
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
              {(["text", "question", "template"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateFallback({ type: t })}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                    fallback.type === t ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Type === Text */}
            {fallback.type === "text" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fallback Text</label>
                <textarea
                  rows={3}
                  value={fallback.text || ""}
                  onChange={e => updateFallback({ text: e.target.value })}
                  placeholder="Enter fallback message..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white resize-none text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Type === Question */}
            {fallback.type === "question" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Question Prompt</label>
                  <input
                    type="text"
                    value={fallback.text || ""}
                    onChange={e => updateFallback({ text: e.target.value })}
                    placeholder="e.g. I didn't get that. How would you like to proceed?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Question Type</label>
                  <div className="flex gap-2 mb-2">
                    {(["open", "buttons", "list"] as const).map(qt => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => updateFallback({ questionType: qt })}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                          (fallback.questionType || "open") === qt ? "bg-blue-600 text-white font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                </div>

                {fallback.questionType === "buttons" && (
                  <ButtonActionEditor
                    buttons={fallback.buttons || []}
                    onChange={btns => updateFallback({ buttons: btns })}
                    maxButtons={3}
                  />
                )}

                {fallback.questionType === "list" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">List Items (Comma separated)</label>
                    <input
                      type="text"
                      value={(fallback.listItems || []).join(", ")}
                      onChange={e => updateFallback({ listItems: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="e.g. Speak to Support, View Hours, Cancel"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Type === Template */}
            {fallback.type === "template" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select WhatsApp Template</label>
                <select
                  value={fallback.templateId || ""}
                  onChange={e => updateFallback({ templateId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-850 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select template...</option>
                  {templates.filter(t => t.approvalStatus === "approved").map(t => (
                    <option key={t.id} value={t.identifier || t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>
            )}
          </Row>

          {/* 2. Business Hours */}
          <Row icon={<Clock className="w-4 h-4 text-amber-600" />} title="Business Hours" badge={bot.businessHoursEnabled ? "On" : "Off"}>
            <label className="flex items-center justify-between cursor-pointer py-1.5">
              <span className="text-xs text-gray-700 font-semibold uppercase tracking-wider">Restrict replies to business hours</span>
              <input type="checkbox" checked={bot.businessHoursEnabled} onChange={e => onChange({ businessHoursEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            </label>
            {bot.businessHoursEnabled && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onChange({ businessHoursMode: "inherit" })}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${bot.businessHoursMode !== "custom" ? "bg-blue-600 text-white font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Inherit from org</button>
                    <button type="button" onClick={() => onChange({ businessHoursMode: "custom" })}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${bot.businessHoursMode === "custom" ? "bg-blue-600 text-white font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Custom for this bot</button>
                  </div>
                  <InfoTooltip text="Inherit uses hours configured in Settings. Custom lets you set offline settings specific to this bot." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Offline Message</label>
                  <textarea rows={2} value={bot.offlineMessage || ""} onChange={e => onChange({ offlineMessage: e.target.value })}
                    placeholder="Offline auto-response message" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white resize-none text-gray-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Offline Coordinator</label>
                  <select value={bot.afterHoursPersonId || ""} onChange={e => onChange({ afterHoursPersonId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-850">
                    <option value="">Offline coordinator...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </Row>

          {/* 3. Human Handoff Redesigned */}
          <Row icon={<UserCheck className="w-4 h-4 text-indigo-600" />} title="Human Handoff" badge={bot.handoffEnabled ? "On" : "Off"}>
            <label className="flex items-center justify-between cursor-pointer py-1.5">
              <span className="text-xs text-gray-700 font-semibold uppercase tracking-wider">Enable Human Handoff Flow Node & Settings</span>
              <input type="checkbox" checked={bot.handoffEnabled} onChange={e => onChange({ handoffEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            </label>
            {bot.handoffEnabled && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Question Text</label>
                  <input
                    type="text"
                    value={bot.handoffQuestionText || ""}
                    onChange={e => onChange({ handoffQuestionText: e.target.value })}
                    placeholder="e.g. Would you like to speak with a team member?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Side-by-side / Stacked mini-cards for Yes and No branches */}
                <div className="space-y-3 pt-1">
                  {/* YES Branch Mini-Card */}
                  <div className="p-3 border border-green-200 bg-green-50/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                      <span>"Yes" Branch — Assign Staff</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Route To</label>
                      <select
                        value={bot.handoffYesPersonId || bot.handoffPersonId || ""}
                        onChange={e => onChange({ handoffYesPersonId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-850"
                      >
                        <option value="">Route to...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* NO Branch Mini-Card */}
                  <div className="p-3 border border-red-200 bg-red-50/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      <span>"No" Branch — Alternate Action</span>
                    </div>

                    <div className="flex gap-1.5 p-1 bg-white border border-gray-200 rounded-lg">
                      {(["message", "template", "triggerChatbot"] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateHandoffNo({ type: t })}
                          className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            handoffNo.type === t ? "bg-red-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {t === "triggerChatbot" ? "Chatbot" : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>

                    {handoffNo.type === "message" && (
                      <textarea
                        rows={2}
                        value={handoffNo.text || ""}
                        onChange={e => updateHandoffNo({ text: e.target.value })}
                        placeholder="Message when user declines handoff..."
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white resize-none text-gray-800"
                      />
                    )}

                    {handoffNo.type === "template" && (
                      <select
                        value={handoffNo.templateId || ""}
                        onChange={e => updateHandoffNo({ templateId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-850"
                      >
                        <option value="">Select template...</option>
                        {templates.filter(t => t.approvalStatus === "approved").map(t => (
                          <option key={t.id} value={t.identifier || t.id}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    )}

                    {handoffNo.type === "triggerChatbot" && (
                      <select
                        value={handoffNo.targetBotId || ""}
                        onChange={e => updateHandoffNo({ targetBotId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-850"
                      >
                        <option value="">Select target chatbot...</option>
                        {availableBots.filter(b => b.id !== bot.id).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Row>

          {/* 4. Website Widget */}
          <Row icon={<Globe className="w-4 h-4 text-emerald-600" />} title="Website Widget">
            <div className="space-y-4">
              {/* Installation Snippet */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Installation Snippet</label>
                  <CopySnippetButton snippet={`<script\n  src="https://app.example.com/widget.js"\n  data-site-id="${bot.siteId || ""}"\n  defer\n></script>`} />
                </div>
                <pre className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[11px] font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`<script\n  src="https://app.example.com/widget.js"\n  data-site-id="${bot.siteId || "—"}"\n  defer\n></script>`}
                </pre>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-normal">
                  Paste this snippet before the closing <code className="font-mono">&lt;/body&gt;</code> tag on any page where you want the chat widget to appear.
                </p>
              </div>

              {/* Allowed Domains */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Allowed Domains</label>
                <input
                  type="text"
                  value={(bot.allowedDomains || []).join(", ")}
                  onChange={e => onChange({ allowedDomains: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g. mantrahealth.com, example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Restrict the widget to load only on these domains. Leave empty to allow all.</p>
              </div>

              {/* Site ID */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Site ID</label>
                <div className="inline-block bg-gray-50 text-gray-600 font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md border border-gray-200 select-all">
                  {bot.siteId || "—"}
                </div>
              </div>
            </div>
          </Row>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 flex-shrink-0 bg-slate-50">
          All changes saved automatically
        </div>
      </div>
    </>
  );
}
