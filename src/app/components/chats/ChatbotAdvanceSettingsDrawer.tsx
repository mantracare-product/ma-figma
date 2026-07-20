import React from "react";
import { X, Clock, AlertTriangle, UserCheck } from "lucide-react";
import { Bot } from "./ChatbotTab";
import { Campaign, WhatsappTemplate } from "../../pages/Chats";
import { useBusinessHours } from "../../../hooks/useBusinessHours";
import { useNavigate } from "react-router";

interface ChatbotAdvanceSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bot: Bot;
  onChange: (patch: Partial<Bot>) => void;
  employees: { id: string; name: string }[];
  campaigns: Campaign[];
  templates: WhatsappTemplate[];
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

export default function ChatbotAdvanceSettingsDrawer({ isOpen, onClose, bot, onChange, employees }: ChatbotAdvanceSettingsDrawerProps) {
  const navigate = useNavigate();
  const businessHours = useBusinessHours();

  if (!isOpen) return null;

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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {/* Fallback Message */}
          <Row icon={<AlertTriangle className="w-4 h-4 text-yellow-650" />} title="Fallback Message" defaultOpen>
            <p className="text-xs text-gray-500">Sent when no flow node matches and Knowledge Base has no answer either.</p>
            <textarea rows={3} value={bot.fallbackMessage || ""} onChange={e => onChange({ fallbackMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white resize-none text-gray-800" />
          </Row>

          {/* Business Hours */}
          <Row icon={<Clock className="w-4 h-4 text-amber-650" />} title="Business Hours" badge={bot.businessHoursEnabled ? "On" : "Off"}>
            <label className="flex items-center justify-between cursor-pointer py-1.5">
              <span className="text-xs text-gray-700 font-semibold uppercase tracking-wider">Restrict replies to business hours</span>
              <input type="checkbox" checked={bot.businessHoursEnabled} onChange={e => onChange({ businessHoursEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            </label>
            {bot.businessHoursEnabled && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onChange({ businessHoursMode: "inherit" })}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${bot.businessHoursMode !== "custom" ? "bg-blue-600 text-white font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Inherit from org</button>
                  <button type="button" onClick={() => onChange({ businessHoursMode: "custom" })}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${bot.businessHoursMode === "custom" ? "bg-blue-600 text-white font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Custom for this bot</button>
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

          {/* Human Handoff */}
          <Row icon={<UserCheck className="w-4 h-4 text-indigo-600" />} title="Human Handoff" badge={bot.handoffEnabled ? "On" : "Off"}>
            <label className="flex items-center justify-between cursor-pointer py-1.5">
              <span className="text-xs text-gray-700 font-semibold uppercase tracking-wider">Let a keyword trigger routing to staff</span>
              <input type="checkbox" checked={bot.handoffEnabled} onChange={e => onChange({ handoffEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            </label>
            {bot.handoffEnabled && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keyword</label>
                  <input type="text" value={bot.handoffKeyword || ""} onChange={e => onChange({ handoffKeyword: e.target.value })}
                    placeholder="e.g. human, agent" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Route To</label>
                  <select value={bot.handoffPersonId || ""} onChange={e => onChange({ handoffPersonId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-850">
                    <option value="">Route to...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </Row>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 flex-shrink-0 bg-slate-50">
          All changes saved automatically
        </div>
      </div>
    </>
  );
}
