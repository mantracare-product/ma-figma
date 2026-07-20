import React, { useState } from "react";
import { X, Clock, AlertTriangle, UserCheck, Calendar, Shield, FileText, Settings, Database, Plus, Trash2, Pencil } from "lucide-react";
import { Bot } from "./ChatbotTab";
import { Campaign, EscalationRule, EscalationMatchType, TemplateRule, WhatsappTemplate } from "../../pages/Chats";
import { Button } from "../ui/Button";
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
  const [open, setOpen] = useState(!!defaultOpen);
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

export default function ChatbotAdvanceSettingsDrawer({ isOpen, onClose, bot, onChange, employees, campaigns, templates }: ChatbotAdvanceSettingsDrawerProps) {
  const navigate = useNavigate();
  const businessHours = useBusinessHours();

  // Local form states for Escalation Rules
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [editingEscalationId, setEditingEscalationId] = useState<string | null>(null);
  const [escalationForm, setEscalationForm] = useState({
    keyword: "",
    matchType: "contains" as EscalationMatchType,
    responsiblePersonId: ""
  });

  // Local form states for Template Rules
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({
    triggerKeyword: "",
    matchType: "contains" as EscalationMatchType,
    templateId: ""
  });

  if (!isOpen) return null;

  // -- Handlers for Escalation Rules --
  const handleSaveEscalation = () => {
    if (!escalationForm.keyword.trim() || !escalationForm.responsiblePersonId) return;
    const rules = [...(bot.escalationRules || [])];
    if (editingEscalationId) {
      const idx = rules.findIndex(r => r.id === editingEscalationId);
      if (idx !== -1) {
        rules[idx] = {
          ...rules[idx],
          keyword: escalationForm.keyword.trim(),
          matchType: escalationForm.matchType,
          responsiblePersonId: escalationForm.responsiblePersonId
        };
      }
    } else {
      rules.push({
        id: `esc-${Date.now()}`,
        keyword: escalationForm.keyword.trim(),
        matchType: escalationForm.matchType,
        responsiblePersonId: escalationForm.responsiblePersonId,
        enabled: true
      });
    }
    onChange({ escalationRules: rules });
    setShowEscalationForm(false);
    setEditingEscalationId(null);
    setEscalationForm({ keyword: "", matchType: "contains", responsiblePersonId: "" });
  };

  // -- Handlers for Template Rules --
  const handleSaveTemplateRule = () => {
    if (!templateForm.triggerKeyword.trim() || !templateForm.templateId) return;
    const rules = [...(bot.templateRules || [])];
    if (editingTemplateId) {
      const idx = rules.findIndex(r => r.id === editingTemplateId);
      if (idx !== -1) {
        rules[idx] = {
          ...rules[idx],
          triggerKeyword: templateForm.triggerKeyword.trim(),
          matchType: templateForm.matchType,
          templateId: templateForm.templateId
        };
      }
    } else {
      rules.push({
        id: `tpl-rule-${Date.now()}`,
        triggerKeyword: templateForm.triggerKeyword.trim(),
        matchType: templateForm.matchType,
        templateId: templateForm.templateId,
        enabled: true
      });
    }
    onChange({ templateRules: rules });
    setShowTemplateForm(false);
    setEditingTemplateId(null);
    setTemplateForm({ triggerKeyword: "", matchType: "contains", templateId: "" });
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

          {/* Appointment Booking */}
          <Row icon={<Calendar className="w-4 h-4 text-rose-600" />} title="Appointment Booking" badge={bot.appointmentBookingEnabled ? "On" : "Off"}>
            <label className="flex items-center justify-between cursor-pointer py-1.5">
              <span className="text-xs text-gray-700 font-semibold uppercase tracking-wider">Trigger a booking campaign on intent</span>
              <input type="checkbox" checked={bot.appointmentBookingEnabled} onChange={e => onChange({ appointmentBookingEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            </label>
            {bot.appointmentBookingEnabled && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Campaign Flow</label>
                  <select value={bot.appointmentCampaignId || ""} onChange={e => onChange({ appointmentCampaignId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-850">
                    <option value="">Select campaign...</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Booking Coordinator</label>
                  <select value={bot.appointmentPersonId || ""} onChange={e => onChange({ appointmentPersonId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-850">
                    <option value="">Select team member...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </Row>

          {/* Escalation Rules */}
          <Row icon={<Shield className="w-4 h-4 text-orange-600" />} title="Escalation Rules" badge={`${(bot.escalationRules || []).filter(r => r.enabled).length} rules`}>
            <p className="text-xs text-gray-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
              Setup keyword intercepts: when patients say these terms, instantly assign to a specific team member.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(bot.escalationRules || []).map(rule => {
                const person = employees.find(e => e.id === rule.responsiblePersonId);
                return (
                  <div key={rule.id} className={`flex items-center justify-between p-2.5 border rounded-lg bg-white ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-mono">{rule.keyword}</span>
                        <span className="text-[9px] bg-slate-50 border px-1.5 py-0.5 rounded text-gray-400 capitalize">{rule.matchType}</span>
                      </div>
                      <p className="text-xs text-gray-500">→ {person?.name || "Unassigned"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer scale-75">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={rule.enabled}
                          onChange={() => {
                            onChange({
                              escalationRules: bot.escalationRules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r)
                            });
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEscalationId(rule.id);
                          setEscalationForm({ keyword: rule.keyword, matchType: rule.matchType, responsiblePersonId: rule.responsiblePersonId });
                          setShowEscalationForm(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            escalationRules: bot.escalationRules.filter(r => r.id !== rule.id)
                          });
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {showEscalationForm ? (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/20 space-y-2.5">
                <h4 className="text-xs font-bold text-gray-800">{editingEscalationId ? "Edit Escalation Rule" : "New Escalation Rule"}</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Keyword</label>
                      <input type="text" value={escalationForm.keyword} onChange={e => setEscalationForm(p => ({ ...p, keyword: e.target.value }))}
                        placeholder="e.g. billing" className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Match Type</label>
                      <select value={escalationForm.matchType} onChange={e => setEscalationForm(p => ({ ...p, matchType: e.target.value as EscalationMatchType }))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                        <option value="contains">Contains</option>
                        <option value="exact">Exact</option>
                        <option value="starts_with">Starts With</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assign Coordinator</label>
                    <select value={escalationForm.responsiblePersonId} onChange={e => setEscalationForm(p => ({ ...p, responsiblePersonId: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                      <option value="">Select person...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => { setShowEscalationForm(false); setEditingEscalationId(null); }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveEscalation}>Save Rule</Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setEditingEscalationId(null); setEscalationForm({ keyword: "", matchType: "contains", responsiblePersonId: "" }); setShowEscalationForm(true); }}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add Escalation Intercept
              </button>
            )}
          </Row>

          {/* WhatsApp Template Rules */}
          <Row icon={<FileText className="w-4 h-4 text-emerald-600" />} title="WhatsApp Template Rules" badge={`${(bot.templateRules ?? []).filter(r => r.enabled).length} rules`}>
            <p className="text-xs text-gray-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
              Define keywords that trigger sending a global pre-approved WhatsApp template.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(bot.templateRules ?? []).map(rule => {
                const template = templates.find(t => t.id === rule.templateId);
                return (
                  <div key={rule.id} className={`flex items-center justify-between p-2.5 border rounded-lg bg-white ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-mono">{rule.triggerKeyword}</span>
                        <span className="text-[9px] bg-slate-50 border px-1.5 py-0.5 rounded text-gray-400 capitalize">{rule.matchType}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium truncate">→ {template?.name || "Unknown Template"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer scale-75">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={rule.enabled}
                          onChange={() => {
                            onChange({
                              templateRules: bot.templateRules?.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r)
                            });
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(rule.id);
                          setTemplateForm({ triggerKeyword: rule.triggerKeyword, matchType: rule.matchType, templateId: rule.templateId });
                          setShowTemplateForm(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            templateRules: bot.templateRules?.filter(r => r.id !== rule.id)
                          });
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {showTemplateForm ? (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/20 space-y-2.5">
                <h4 className="text-xs font-bold text-gray-800">{editingTemplateId ? "Edit Template Rule" : "New Template Rule"}</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Keyword</label>
                      <input type="text" value={templateForm.triggerKeyword} onChange={e => setTemplateForm(p => ({ ...p, triggerKeyword: e.target.value }))}
                        placeholder="e.g. coupon" className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Match Type</label>
                      <select value={templateForm.matchType} onChange={e => setTemplateForm(p => ({ ...p, matchType: e.target.value as EscalationMatchType }))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                        <option value="contains">Contains</option>
                        <option value="exact">Exact</option>
                        <option value="starts_with">Starts With</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Template to Send</label>
                    <select value={templateForm.templateId} onChange={e => setTemplateForm(p => ({ ...p, templateId: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                      <option value="">Select template...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => { setShowTemplateForm(false); setEditingTemplateId(null); }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveTemplateRule}>Save Rule</Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm({ triggerKeyword: "", matchType: "contains", templateId: "" }); setShowTemplateForm(true); }}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add Template Send Rule
              </button>
            )}
          </Row>

          {/* AI Model & Response Style */}
          <Row icon={<Settings className="w-4 h-4 text-gray-650" />} title="AI Model & Response Style">
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">AI Model Tier</label>
                <select value={bot.aiModelTier || "Balanced"} onChange={e => onChange({ aiModelTier: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                  <option value="Express">Express</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Smartest">Smartest</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tone & Voice</label>
                <select value={bot.aiVoiceStyle || "Professional"} onChange={e => onChange({ aiVoiceStyle: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800">
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Concise">Concise</option>
                  <option value="Empathetic">Empathetic</option>
                </select>
              </div>
            </div>
          </Row>

          {/* Knowledge Base */}
          <Row icon={<Database className="w-4 h-4 text-blue-650" />} title="Knowledge Base" badge={`${(bot.knowledgeBases ?? []).length} linked`}>
            <p className="text-xs text-gray-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
              Attach reference material this bot can search when a free-text question doesn't match any flow node.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate("/knowledge-base", { state: { prefillBot: { id: bot.id, name: bot.name } } });
              }}
              className="w-full mt-2 font-bold text-xs"
            >
              Manage Knowledge Base
            </Button>
          </Row>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 flex-shrink-0 bg-slate-50">
          All changes saved automatically
        </div>
      </div>
    </>
  );
}
