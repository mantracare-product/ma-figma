// ReferralShareDrawer.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, Copy, Link2, MessageSquare, Mail, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import VariablePickerButton from "../process/VariablePickerButton";
import {
  ShareChannel,
  ShareClient,
  ShareLiteralRecipient,
} from "../webform/shareTypes";
import ShareRecipientPicker from "../webform/ShareRecipientPicker";
import {
  ReferralShareDrawerProps,
} from "./referralShareTypes";

// ─── Style constants ──────────────────────────────────────────────────────────
const SELECT_STYLE = "px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer w-full";
const SELECT_INLINE: React.CSSProperties = { fontFamily: "Outfit, sans-serif", color: "#64748B" };

const LABEL_STYLE: React.CSSProperties = { fontFamily: "DM Sans, sans-serif", color: "#020817" };
const MUTED_STYLE: React.CSSProperties = { fontFamily: "Outfit, sans-serif", color: "#94A3B8" };

// Mock connected account lists per channel
const CONNECTED_ACCOUNTS: Record<ShareChannel, Array<{ value: string; label: string }>> = {
  sms: [
    { value: "+15551234567", label: "+1 (555) 123-4567" },
    { value: "+15559876543", label: "+1 (555) 987-6543" },
  ],
  whatsapp: [
    { value: "+15551234567", label: "+1 (555) 123-4567" },
    { value: "+15550001122", label: "+1 (555) 000-1122" },
  ],
  email: [
    { value: "support@company.com", label: "support@company.com" },
    { value: "notifications@company.com", label: "notifications@company.com" },
  ],
};

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

// ─── SMS Panel ───────────────────────────────────────────────────────────────

function SmsPanel({ link }: { link: string }) {
  const defaultMsg = `Hi! Check out MantraAssist and get 15% off using my link: ${link}`;
  const [message, setMessage] = useState(defaultMsg);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessage(`Hi! Check out MantraAssist and get 15% off using my link: ${link}`);
  }, [link]);

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-4">
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

// ─── Email Panel ─────────────────────────────────────────────────────────────

function EmailPanel({ link, code }: { link: string; code: string }) {
  const defaultSubject = `Join MantraAssist — 15% off with my referral`;
  const defaultBody = `Hello,\n\nI wanted to share MantraAssist with you — smart healthcare practice automation. Use my link below to get 15% off:\n\n${link}\n\n(Referral code: ${code})\n\nThanks!`;

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSubject(`Join MantraAssist — 15% off with my referral`);
    setBody(`Hello,\n\nI wanted to share MantraAssist with you — smart healthcare practice automation. Use my link below to get 15% off:\n\n${link}\n\n(Referral code: ${code})\n\nThanks!`);
  }, [link, code]);

  return (
    <div className="space-y-4">
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

function WhatsAppPanel({ onCloseDrawer }: { onCloseDrawer: () => void }) {
  const navigate = useNavigate();
  const [templates] = useState<WhatsappTemplate[]>(() => loadTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const t = loadTemplates();
    return t.length > 0 ? t[0].id : "";
  });

  const handleNavigateToCreateTemplate = () => {
    onCloseDrawer();
    navigate("/chats?tab=templates&action=create");
  };

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 space-y-2">
          <p style={{ fontFamily: "Outfit, sans-serif" }}>No templates yet — create one below to get started.</p>
          <button
            type="button"
            onClick={handleNavigateToCreateTemplate}
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

          <button
            type="button"
            onClick={handleNavigateToCreateTemplate}
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

export default function ReferralShareDrawer({ target, onClose, onSend }: ReferralShareDrawerProps) {
  const [channel, setChannel] = useState<ShareChannel>("sms");
  const [connectedAccount, setConnectedAccount] = useState<string>("");

  // Parallel recipient arrays: selectedClients and selectedLiterals
  const [selectedClients, setSelectedClients] = useState<ShareClient[]>([]);
  const [selectedLiterals, setSelectedLiterals] = useState<ShareLiteralRecipient[]>([]);

  // Reset state when target changes
  useEffect(() => {
    if (target) {
      setChannel("sms");
      setConnectedAccount("");
      setSelectedClients([]);
      setSelectedLiterals([]);
    }
  }, [target?.plan, target?.link]);

  if (!target) return null;

  const channelLabels: Record<ShareChannel, string> = {
    sms: "Send SMS",
    whatsapp: "Send via WhatsApp",
    email: "Send Email",
  };

  const handleChannelChange = (newChannel: ShareChannel) => {
    setChannel(newChannel);
    setConnectedAccount("");
    setSelectedClients([]);
    setSelectedLiterals([]);
  };

  const handlePrimaryAction = () => {
    const totalSelected = selectedClients.length + selectedLiterals.length;
    if (totalSelected > 0) {
      onSend?.({
        plan: target.plan,
        channel,
        clients: selectedClients,
        literals: selectedLiterals,
        connectedAccount,
      });
    }
    toast.success(`Ready to send via ${CHANNEL_CONFIG[channel].label}`);
    onClose();
  };

  const hasValidAudience = selectedClients.length + selectedLiterals.length > 0;
  const isSendDisabled = !hasValidAudience;

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
                SHARE REFERRAL LINK
              </p>
              <h2 className="text-lg font-bold truncate" style={LABEL_STYLE}>
                {target.plan} Plan Referral
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
          {/* 1. Copy Link block */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={MUTED_STYLE}>
              REFERRAL LINK
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-border rounded-lg">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono truncate flex-1" style={{ color: "#64748B" }}>
                {target.link}
              </span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(target.link); toast.success("Link copied to clipboard"); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg border border-border shrink-0 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="flex items-center justify-between text-xs font-medium px-1 text-[#64748B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              <span>Code: <span className="font-mono text-[#020817] font-semibold">{target.code}</span></span>
              <span>Commission Rate: <span className="text-[#4F8EF7] font-semibold">{target.rate}</span></span>
            </div>
          </div>

          {/* 2. Channel Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={LABEL_STYLE}>
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => handleChannelChange(e.target.value as ShareChannel)}
              className={SELECT_STYLE}
              style={SELECT_INLINE}
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>

          {/* 3. Connected Account */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={LABEL_STYLE}>
              Connected Account
            </label>
            <select
              value={connectedAccount}
              onChange={(e) => setConnectedAccount(e.target.value)}
              className={SELECT_STYLE}
              style={SELECT_INLINE}
            >
              <option value="">Select {CHANNEL_CONFIG[channel].label} account...</option>
              {CONNECTED_ACCOUNTS[channel].map((acc) => (
                <option key={acc.value} value={acc.value}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Combined Recipients Section (Single Picker) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={LABEL_STYLE}>
              Recipients
            </label>
            <ShareRecipientPicker
              channel={channel}
              selectedClients={selectedClients}
              onClientsChange={setSelectedClients}
              selectedLiterals={selectedLiterals}
              onLiteralsChange={setSelectedLiterals}
            />
          </div>

          {/* 5. Channel-specific message body panel */}
          {channel === "sms" && <SmsPanel link={target.link} />}
          {channel === "email" && <EmailPanel link={target.link} code={target.code} />}
          {channel === "whatsapp" && <WhatsAppPanel onCloseDrawer={onClose} />}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isSendDisabled}
            className="px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {channelLabels[channel]}
          </button>
        </div>
      </div>
    </>
  );
}
