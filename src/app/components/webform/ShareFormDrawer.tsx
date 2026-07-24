// ShareFormDrawer.tsx
// Note on VariablePickerButton: a standalone exported VariablePickerButton exists at
// src/app/components/process/VariablePickerButton.tsx — we import from there directly.
// This gives us the full system-field picker, which works fine for a share action since
// the user may also want to insert contact variables alongside the static form link.

import React, { useState, useRef, useEffect } from "react";
import { X, Copy, Link2, MessageSquare, Mail, MessageCircle, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import VariablePickerButton from "../process/VariablePickerButton";
import { ShareFormDrawerProps, ShareChannel, ShareClient, ShareCondition, ShareTarget, ShareTargetKind } from "./shareTypes";
import ShareRecipientPicker from "./ShareRecipientPicker";
import ShareConditionsEditor from "./ShareConditionsEditor";

// ─── Style constants (duplicated from WebForms.tsx to avoid circular imports) ──
// These match SELECT_STYLE and SELECT_INLINE exactly from WebForms.tsx.
const SELECT_STYLE = "px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer w-full";
const SELECT_INLINE: React.CSSProperties = { fontFamily: "Outfit, sans-serif", color: "#64748B" };

const LABEL_STYLE: React.CSSProperties = { fontFamily: "DM Sans, sans-serif", color: "#020817" };
const MUTED_STYLE: React.CSSProperties = { fontFamily: "Outfit, sans-serif", color: "#94A3B8" };

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin", "Arabic", "Portuguese", "Russian", "Japanese"];

interface WhatsappTemplate {
  id: string;
  name: string;
  identifier: string;
  category: "Marketing" | "Utility" | "Authentication";
  language: string;
  header: { type: "none" | "text" | "image"; content?: string };
  bodyText: string;
  footerText?: string;
  buttons: Array<{ type: string; label: string; value?: string }>;
  createdAt: string;
}

function loadTemplates(): WhatsappTemplate[] {
  try {
    return JSON.parse(localStorage.getItem("whatsappGlobalTemplates") || "[]");
  } catch {
    return [];
  }
}

function saveTemplates(templates: WhatsappTemplate[]) {
  localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(templates));
}

// ─── SMS Panel ───────────────────────────────────────────────────────────────

function SmsPanel({ formUrl }: { formUrl: string }) {
  const defaultMsg = `Hi! Please fill out this form: ${formUrl}`;
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState(defaultMsg);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={LABEL_STYLE}>Connected Account</label>
        <select value={account} onChange={e => setAccount(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
          <option value="">Select SMS account...</option>
          <option value="+15551234567">+1 (555) 123-4567</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold" style={LABEL_STYLE}>Message</label>
          <VariablePickerButton
            targetRef={textareaRef}
            value={message}
            onChange={setMessage}
            label="{ } Insert Variable"
          />
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Type your SMS message..."
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
        <p className="text-xs mt-1 text-right" style={MUTED_STYLE}>
          {charCount} chars · {smsSegments} SMS segment{smsSegments !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Email Panel ──────────────────────────────────────────────────────────────

function EmailPanel({ formName, formUrl }: { formName: string; formUrl: string }) {
  const defaultSubject = `${formName} — please complete this form`;
  const defaultBody = `Hello,\n\nPlease complete the following form: ${formUrl}\n\nThanks!`;
  const [account, setAccount] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={LABEL_STYLE}>Connected Account</label>
        <select value={account} onChange={e => setAccount(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
          <option value="">Select email account...</option>
          <option value="support@company.com">support@company.com</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={LABEL_STYLE}>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Email subject..."
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold" style={LABEL_STYLE}>Email Body</label>
          <VariablePickerButton
            targetRef={bodyRef}
            value={body}
            onChange={setBody}
            label="{ } Insert Variable"
          />
        </div>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={7}
          placeholder="Hello {{contact_name}}, ..."
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>
    </div>
  );
}

// ─── WhatsApp Panel ──────────────────────────────────────────────────────────

interface WhatsAppPanelProps {
  formUrl: string;
  creatingTemplate: boolean;
  setCreatingTemplate: (v: boolean) => void;
  saveTriggerRef: React.MutableRefObject<(() => void) | null>;
}

function WhatsAppPanel({
  formUrl,
  creatingTemplate,
  setCreatingTemplate,
  saveTriggerRef,
}: WhatsAppPanelProps) {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>(() => loadTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const t = loadTemplates();
    return t.length > 0 ? t[0].id : "";
  });
  const [account, setAccount] = useState("");

  // Inline template creation form state
  const defaultBodyText = `Hi! Please fill out the form using the button below.`;
  const [tplName, setTplName] = useState("");
  const [tplIdentifier, setTplIdentifier] = useState("");
  const [tplCategory, setTplCategory] = useState<"Marketing" | "Utility" | "Authentication">("Marketing");
  const [tplLanguage, setTplLanguage] = useState("English");
  const [tplBody, setTplBody] = useState(defaultBodyText);
  const [tplFooter, setTplFooter] = useState("");
  const [tplButtonLabel, setTplButtonLabel] = useState("Fill Out Form");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleNameChange = (val: string) => {
    const identifierVal = val.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    setTplName(val);
    setTplIdentifier(identifierVal);
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim()) { toast.error("Template name is required"); return; }
    if (!tplIdentifier.trim()) { toast.error("Template identifier is required"); return; }
    if (!tplBody.trim()) { toast.error("Template body text is required"); return; }
    const current = loadTemplates();
    const isDuplicate = current.some(t => t.identifier.toLowerCase() === tplIdentifier.toLowerCase());
    if (isDuplicate) { toast.error("Template identifier must be unique"); return; }

    const newTemplate: WhatsappTemplate = {
      id: `tpl-${Date.now()}`,
      name: tplName.trim(),
      identifier: tplIdentifier.trim(),
      category: tplCategory,
      language: tplLanguage,
      header: { type: "none", content: "" },
      bodyText: tplBody.trim(),
      footerText: tplFooter.trim() || undefined,
      buttons: [
        { type: "url", label: tplButtonLabel.trim() || "Fill Out Form", value: formUrl }
      ],
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newTemplate];
    saveTemplates(updated);
    setTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setCreatingTemplate(false);
    // Reset form
    setTplName(""); setTplIdentifier(""); setTplBody(defaultBodyText); setTplFooter("");
    setTplCategory("Marketing"); setTplLanguage("English");
    setTplButtonLabel("Fill Out Form");
    toast.success("Template created and saved to Chats → Templates");
  };

  // Keep save trigger ref updated so main drawer can execute it
  useEffect(() => {
    if (creatingTemplate) {
      saveTriggerRef.current = handleSaveTemplate;
    } else {
      saveTriggerRef.current = null;
    }
    return () => {
      saveTriggerRef.current = null;
    };
  }, [creatingTemplate, tplName, tplIdentifier, tplCategory, tplLanguage, tplBody, tplFooter, formUrl, tplButtonLabel]);

  if (creatingTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold" style={LABEL_STYLE}>Create WhatsApp Template</h4>
          <button
            onClick={() => setCreatingTemplate(false)}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            ← Back to templates
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={LABEL_STYLE}>Template Name *</label>
            <input
              type="text"
              value={tplName}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Share Form Link"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={LABEL_STYLE}>Template Identifier *</label>
            <input
              type="text"
              value={tplIdentifier}
              onChange={e => setTplIdentifier(e.target.value)}
              placeholder="share_form_link"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              style={{ fontFamily: "monospace", color: "#020817" }}
            />
            <p className="text-[10px] mt-1" style={MUTED_STYLE}>Auto-generated from name. Must be unique.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={LABEL_STYLE}>Category *</label>
              <select value={tplCategory} onChange={e => setTplCategory(e.target.value as any)} className={SELECT_STYLE} style={SELECT_INLINE}>
                <option value="Marketing">Marketing</option>
                <option value="Utility">Utility</option>
                <option value="Authentication">Authentication</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={LABEL_STYLE}>Language *</label>
              <select value={tplLanguage} onChange={e => setTplLanguage(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={LABEL_STYLE}>Body Text *</label>
              <VariablePickerButton
                targetRef={bodyRef}
                value={tplBody}
                onChange={setTplBody}
                label="{ } Insert Variable"
              />
            </div>
            <textarea
              ref={bodyRef}
              value={tplBody}
              onChange={e => setTplBody(e.target.value)}
              rows={4}
              placeholder="Hi {{contact_name}}, ..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={LABEL_STYLE}>Footer Text (optional)</label>
            <input
              type="text"
              value={tplFooter}
              onChange={e => setTplFooter(e.target.value)}
              placeholder="e.g. Reply STOP to unsubscribe"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={LABEL_STYLE}>
              Button
            </label>
            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50/40 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-500 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  Visit Website
                </div>
                <input
                  type="text"
                  value={tplButtonLabel}
                  onChange={e => setTplButtonLabel(e.target.value)}
                  placeholder="Button text..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-500 font-mono truncate">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {formUrl}
              </div>
              <p className="text-xs" style={MUTED_STYLE}>
                Automatically linked to this form. Only the button text is editable here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 space-y-2">
          <p style={{ fontFamily: "Outfit, sans-serif" }}>No templates yet — create one below to get started.</p>
          <button
            onClick={() => setCreatingTemplate(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" /> Create new template
          </button>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={LABEL_STYLE}>Template</label>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className={SELECT_STYLE}
              style={SELECT_INLINE}
            >
              <option value="">Select template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={LABEL_STYLE}>Connected Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
              <option value="">Select WhatsApp account...</option>
              <option value="+15551234567">+1 (555) 123-4567</option>
            </select>
          </div>

          <button
            onClick={() => setCreatingTemplate(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" /> Create new template
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<ShareChannel, { label: string; icon: React.ReactNode }> = {
  sms: { label: "SMS", icon: <MessageSquare className="w-4 h-4" /> },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
  email: { label: "Email", icon: <Mail className="w-4 h-4" /> },
};

export default function ShareFormDrawer({ target, onClose, onSend }: ShareFormDrawerProps) {
  const [channel, setChannel] = useState<ShareChannel>("sms");

  // New Audience Filtering and Recipient states
  const [selectedClients, setSelectedClients] = useState<ShareClient[]>([]);
  const [sendMode, setSendMode] = useState<"manual" | "conditions">("manual");
  const [conditions, setConditions] = useState<ShareCondition[]>([
    { id: "cond-1", fieldSource: "", field: "", operator: "", value: "" },
  ]);

  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const saveTemplateFnRef = useRef<(() => void) | null>(null);

  // Reset channel and audience states each time a new target opens
  useEffect(() => {
    if (target) {
      setChannel("sms");
      setSelectedClients([]);
      setSendMode("manual");
      setConditions([{ id: "cond-1", fieldSource: "", field: "", operator: "", value: "" }]);
      setCreatingTemplate(false);
    }
  }, [target?.id]);

  if (!target) return null;

  const formUrl = target.kind === "flow"
    ? `https://app.myaifrontdesk.com/flows/flow-${target.id}`
    : `https://app.myaifrontdesk.com/forms/form-${target.id}`;

  const channelLabels: Record<ShareChannel, string> = {
    sms: "Send SMS",
    whatsapp: "Send via WhatsApp",
    email: "Send Email",
  };

  const handlePrimaryAction = () => {
    if (channel === "whatsapp" && creatingTemplate) {
      if (saveTemplateFnRef.current) {
        saveTemplateFnRef.current();
      }
    } else {
      if (selectedClients.length > 0) {
        onSend?.({
          formId: target.id,
          clients: selectedClients,
          channel,
          kind: target.kind,
        });
      }
      // TODO: resolve condition-based audience to concrete clients
      toast.success(`Ready to send via ${CHANNEL_CONFIG[channel].label}`);
      onClose();
    }
  };

  const hasValidAudience =
    sendMode === "manual"
      ? selectedClients.length > 0
      : conditions.some(c => c.fieldSource && c.field && c.operator);

  const isSendDisabled = !creatingTemplate && !hasValidAudience;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={MUTED_STYLE}>
                SHARE {target.kind === "flow" ? "FLOW" : "FORM"}
              </p>
              <h2 className="text-lg font-bold truncate" style={LABEL_STYLE}>
                {target.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Form Link block */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={MUTED_STYLE}>
              {target.kind === "flow" ? "FLOW LINK" : "FORM LINK"}
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-border rounded-lg">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono truncate flex-1" style={{ color: "#64748B" }}>
                {formUrl}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(formUrl); toast.success("Link copied to clipboard"); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg border border-border shrink-0 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>

            {target.kind === "form" && target.status === "draft" && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs" style={{ fontFamily: "Outfit, sans-serif", color: "#92400e" }}>
                  This form is a draft — the link won't be publicly live until it's published.
                </p>
              </div>
            )}
          </div>

          {/* 2. Send To Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold" style={LABEL_STYLE}>Send To</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSendMode("manual")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sendMode === "manual"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-border text-[#64748B] hover:bg-gray-50"
                    }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Select Manually
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode("conditions")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sendMode === "conditions"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-border text-[#64748B] hover:bg-gray-50"
                    }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Apply Conditions
                </button>
              </div>
            </div>

            {sendMode === "manual" ? (
              <ShareRecipientPicker
                selected={selectedClients}
                onChange={setSelectedClients}
              />
            ) : (
              <ShareConditionsEditor
                enabled={true}
                onEnabledChange={() => { }}
                conditions={conditions}
                onConditionsChange={setConditions}
                showToggle={false}
              />
            )}
          </div>

          {/* 4. Share via segmented control */}
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={LABEL_STYLE}>Share via</p>
            <div className="inline-flex border border-border rounded-lg overflow-hidden w-full">
              {(Object.keys(CHANNEL_CONFIG) as ShareChannel[]).map(ch => (
                <button
                  key={ch}
                  disabled={creatingTemplate}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${channel === ch ? "bg-black text-white" : "bg-white text-[#64748B] hover:bg-gray-50"
                    }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {CHANNEL_CONFIG[ch].icon}
                  {CHANNEL_CONFIG[ch].label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Channel-specific panel */}
          {channel === "sms" && <SmsPanel formUrl={formUrl} />}
          {channel === "email" && <EmailPanel formName={target.name} formUrl={formUrl} />}
          {channel === "whatsapp" && (
            <WhatsAppPanel
              formUrl={formUrl}
              creatingTemplate={creatingTemplate}
              setCreatingTemplate={setCreatingTemplate}
              saveTriggerRef={saveTemplateFnRef}
            />
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrimaryAction}
            disabled={isSendDisabled}
            className={`px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {creatingTemplate ? "Save Template" : channelLabels[channel]}
          </button>
        </div>
      </div>
    </>
  );
}
