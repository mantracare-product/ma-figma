// ShareDocumentDrawer.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  X, Copy, Link2, MessageSquare, Mail, MessageCircle, Plus, Share2,
  FileText, FileCode, Check, Paperclip, Send, ChevronDown, User, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import VariablePickerButton from "../process/VariablePickerButton";
import {
  ShareChannel,
  ShareClient,
  ShareLiteralRecipient,
} from "../webform/shareTypes";

const LABEL_STYLE: React.CSSProperties = { fontFamily: "DM Sans, sans-serif", color: "#020817" };
const MUTED_STYLE: React.CSSProperties = { fontFamily: "Outfit, sans-serif", color: "#94A3B8" };

export type ShareDocumentFormat = "pdf" | "word" | "link";

// Mock connected account lists per channel
const CONNECTED_ACCOUNTS: Record<ShareChannel, Array<{ value: string; label: string }>> = {
  sms: [
    { value: "+15551234567", label: "+1 (555) 123-4567 (Main Line)" },
    { value: "+15559876543", label: "+1 (555) 987-6543 (Support)" },
  ],
  whatsapp: [
    { value: "+15551234567", label: "+1 (555) 123-4567 (WhatsApp Business)" },
    { value: "+15550001122", label: "+1 (555) 000-1122 (Client Support)" },
  ],
  email: [
    { value: "support@mantracare.com", label: "support@mantracare.com" },
    { value: "documents@mantracare.com", label: "documents@mantracare.com" },
  ],
};

const ALL_CRM_CLIENTS: ShareClient[] = [
  { id: "c1", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "+1 (555) 123-4567" },
  { id: "c2", name: "Michael Chen", email: "mchen@email.com", phone: "+1 (555) 987-6543" },
  { id: "c3", name: "Emily Davis", email: "emily.d@email.com", phone: "+1 (555) 432-1098" },
  { id: "c4", name: "Robert Wilson", email: "rwilson@email.com", phone: "+1 (555) 456-7890" },
  { id: "c5", name: "Jessica Brown", email: "jbrown@email.com", phone: "+1 (555) 765-4321" },
  { id: "c6", name: "David Martinez", email: "d.martinez@email.com", phone: "+1 (555) 345-6789" },
  { id: "c7", name: "Lisa Anderson", email: "l.anderson@email.com", phone: "+1 (555) 789-0123" },
  { id: "c8", name: "James Taylor", email: "jtaylor@email.com", phone: "+1 (555) 678-9012" },
];

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

// ─── Custom Popover Dropdown Component ──────────────────────────────────────────
interface CustomDropdownOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

function CustomDropdown({
  options,
  value,
  onChange,
  label,
  placeholder = "Select...",
}: {
  options: CustomDropdownOption[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => o.value === value);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700" style={LABEL_STYLE}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-2xs text-left"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOpt?.icon}
          <span className="truncate">{selectedOpt?.label || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                  isSelected ? "bg-blue-50 text-blue-900 font-bold" : "text-slate-700 hover:bg-slate-50 font-medium"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon}
                  <div className="truncate">
                    <p className="truncate">{opt.label}</p>
                    {opt.subLabel && <p className="text-[10px] text-slate-400 font-normal">{opt.subLabel}</p>}
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SMS Panel ───────────────────────────────────────────────────────────────
function SmsPanel({
  docUrl,
  docName,
  format
}: {
  docUrl: string;
  docName: string;
  format: ShareDocumentFormat;
}) {
  const getFormatText = () => {
    if (format === "pdf") return `Hi! Please find attached your PDF document "${docName}.pdf".`;
    if (format === "word") return `Hi! Please find attached your Word document "${docName}.docx".`;
    return `Hi! Please view your document "${docName}" online: ${docUrl}`;
  };

  const [message, setMessage] = useState(getFormatText());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessage(getFormatText());
  }, [format, docName, docUrl]);

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800" style={LABEL_STYLE}>SMS Message</label>
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
          rows={4}
          placeholder="Type your SMS message..."
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:border-slate-500 font-medium leading-relaxed"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
        <p className="text-[11px] mt-1 text-right text-slate-400" style={MUTED_STYLE}>
          {charCount} chars · {smsSegments} SMS segment{smsSegments !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Email Panel ─────────────────────────────────────────────────────────────
function EmailPanel({
  docName,
  docUrl,
  clientName,
  format,
}: {
  docName: string;
  docUrl: string;
  clientName: string;
  format: ShareDocumentFormat;
}) {
  const getSubject = () => {
    if (format === "pdf") return `${docName}.pdf — Document from MantraCare`;
    if (format === "word") return `${docName}.docx — Word Document from MantraCare`;
    return `${docName} — Document from MantraCare`;
  };

  const getBody = () => {
    if (format === "pdf") {
      return `Hello ${clientName || "there"},\n\nPlease find attached your PDF document "${docName}.pdf".\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nMantraCare Team`;
    }
    if (format === "word") {
      return `Hello ${clientName || "there"},\n\nPlease find attached your editable Word document "${docName}.docx".\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nMantraCare Team`;
    }
    return `Hello ${clientName || "there"},\n\nPlease review your document "${docName}" using the link below:\n${docUrl}\n\nIf you have any questions, feel free to reply directly to this email.\n\nBest regards,\nMantraCare Team`;
  };

  const [subject, setSubject] = useState(getSubject());
  const [body, setBody] = useState(getBody());
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSubject(getSubject());
    setBody(getBody());
  }, [format, docName, docUrl, clientName]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1" style={LABEL_STYLE}>Email Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Email subject..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800" style={LABEL_STYLE}>Email Body</label>
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
          rows={5}
          placeholder="Hello..."
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:border-slate-500 font-medium leading-relaxed"
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

  const templateOptions: CustomDropdownOption[] = templates.map((t) => ({
    value: t.id,
    label: t.name,
    subLabel: t.category,
  }));

  return (
    <div className="space-y-3">
      {templates.length === 0 ? (
        <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
          <p style={{ fontFamily: "Outfit, sans-serif" }}>No WhatsApp templates configured yet.</p>
          <button
            type="button"
            onClick={handleNavigateToCreateTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" /> Create new template
          </button>
        </div>
      ) : (
        <>
          <CustomDropdown
            label="WhatsApp Template"
            options={templateOptions}
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            placeholder="Select template..."
          />

          <button
            type="button"
            onClick={handleNavigateToCreateTemplate}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3 h-3" /> Create new template
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<ShareChannel, { label: string; icon: React.ReactNode }> = {
  sms: { label: "SMS", icon: <MessageSquare className="w-4 h-4 text-emerald-600" /> },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="w-4 h-4 text-emerald-600" /> },
  email: { label: "Email", icon: <Mail className="w-4 h-4 text-blue-600" /> },
};

export interface ShareDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  onSend?: (payload: {
    channel: ShareChannel;
    format: ShareDocumentFormat;
    clients: ShareClient[];
    literals: ShareLiteralRecipient[];
    connectedAccount?: string;
  }) => void;
}

export default function ShareDocumentDrawer({
  isOpen,
  onClose,
  documentTitle,
  client,
  onSend,
}: ShareDocumentDrawerProps) {
  const [channel, setChannel] = useState<ShareChannel>("email");
  const [shareFormat, setShareFormat] = useState<ShareDocumentFormat>("pdf");
  const [connectedAccount, setConnectedAccount] = useState<string>("");

  // Multiple recipients support:
  const [selectedClients, setSelectedClients] = useState<ShareClient[]>([
    {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone || "",
    },
  ]);
  const [selectedLiterals, setSelectedLiterals] = useState<ShareLiteralRecipient[]>([]);
  const [customInputVal, setCustomInputVal] = useState<string>("");
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target as Node)) {
        setIsRecipientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedClients([
        {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || "",
        },
      ]);
      setSelectedLiterals([]);
      setCustomInputVal("");
      setIsRecipientDropdownOpen(false);
      setConnectedAccount(CONNECTED_ACCOUNTS[channel][0]?.value || "");
    }
  }, [isOpen, client.id, channel]);

  if (!isOpen) return null;

  const docUrl = `https://app.mantraassist.com/docs/view?client=${client.id}&doc=${encodeURIComponent(documentTitle)}`;

  const channelLabels: Record<ShareChannel, string> = {
    sms: "Send SMS",
    whatsapp: "Send via WhatsApp",
    email: "Send Email",
  };

  const handleChannelChange = (newChannel: string) => {
    const ch = newChannel as ShareChannel;
    setChannel(ch);
    setConnectedAccount(CONNECTED_ACCOUNTS[ch][0]?.value || "");
  };

  const formatOptions: CustomDropdownOption[] = [
    { value: "pdf", label: "PDF Document", subLabel: ".pdf File Attachment", icon: <FileText className="w-4 h-4 text-rose-500" /> },
    { value: "word", label: "Word Document", subLabel: ".docx File Attachment", icon: <FileCode className="w-4 h-4 text-blue-500" /> },
    { value: "link", label: "Web Link", subLabel: "Online Interactive Viewer", icon: <Link2 className="w-4 h-4 text-slate-500" /> },
  ];

  const channelOptions: CustomDropdownOption[] = [
    { value: "email", label: "Email", icon: <Mail className="w-4 h-4 text-blue-500" /> },
    { value: "sms", label: "SMS", icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
    { value: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4 text-emerald-500" /> },
  ];

  const accountOptions: CustomDropdownOption[] = CONNECTED_ACCOUNTS[channel].map((acc) => ({
    value: acc.value,
    label: acc.label,
  }));

  // List of all CRM clients with clean names
  const clientOptionsList: CustomDropdownOption[] = [
    {
      value: client.id,
      label: client.name,
      icon: <User className="w-3.5 h-3.5 text-blue-600" />,
    },
    ...ALL_CRM_CLIENTS.filter(c => c.id !== client.id && c.name !== client.name).map((c) => ({
      value: c.id,
      label: c.name,
      icon: <User className="w-3.5 h-3.5 text-slate-400" />,
    })),
  ];

  const handleToggleClient = (clientId: string) => {
    const isAlreadySelected = selectedClients.some(c => c.id === clientId);
    if (isAlreadySelected) {
      setSelectedClients(prev => prev.filter(c => c.id !== clientId));
    } else {
      const found = (clientId === client.id)
        ? { id: client.id, name: client.name, email: client.email, phone: client.phone || "" }
        : ALL_CRM_CLIENTS.find(c => c.id === clientId);
      if (found) {
        setSelectedClients(prev => [...prev, found]);
      }
    }
  };

  const handleRemoveClient = (clientId: string) => {
    setSelectedClients(prev => prev.filter(c => c.id !== clientId));
  };

  const handleAddCustomRecipient = () => {
    const trimmed = customInputVal.trim();
    if (!trimmed) return;
    if (selectedLiterals.some(l => l.value.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Recipient already added.");
      return;
    }
    const newLiteral: ShareLiteralRecipient = {
      id: "lit-" + Date.now().toString(),
      value: trimmed,
    };
    setSelectedLiterals(prev => [...prev, newLiteral]);
    setCustomInputVal("");
    toast.success(`Added ${trimmed}`);
  };

  const handleRemoveLiteral = (litId: string) => {
    setSelectedLiterals(prev => prev.filter(l => l.id !== litId));
  };

  const totalRecipientsCount = selectedClients.length + selectedLiterals.length;
  const hasValidRecipient = totalRecipientsCount > 0;

  const handlePrimaryAction = () => {
    if (!hasValidRecipient) {
      toast.error("Please select at least one recipient.");
      return;
    }

    onSend?.({
      channel,
      format: shareFormat,
      clients: selectedClients,
      literals: selectedLiterals,
      connectedAccount,
    });

    const formatLabel = shareFormat === "pdf" ? "PDF document" : shareFormat === "word" ? "Word document" : "document link";
    const recipientSummary = selectedClients.map(c => c.name).concat(selectedLiterals.map(l => l.value)).join(", ");
    toast.success(`Sent ${formatLabel} "${documentTitle}" to ${recipientSummary} via ${CHANNEL_CONFIG[channel].label}!`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[750] bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[800] w-full max-w-[520px] bg-white shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex-shrink-0 bg-slate-50/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5" style={MUTED_STYLE}>
                  SHARE DOCUMENT
                </p>
                <h2 className="text-sm font-bold truncate text-slate-900" style={LABEL_STYLE}>
                  {documentTitle}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* 1. Share Format Dropdown */}
          <CustomDropdown
            label="Share Format"
            options={formatOptions}
            value={shareFormat}
            onChange={(v) => setShareFormat(v as ShareDocumentFormat)}
          />

          {/* 2. Format Details & Attachment Indicator */}
          {shareFormat === "link" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700" style={LABEL_STYLE}>
                Document Web Link
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-mono truncate flex-1 text-slate-600">
                  {docUrl}
                </span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(docUrl); toast.success("Document link copied to clipboard"); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-slate-200 shrink-0 transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              {shareFormat === "pdf" ? (
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileCode className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate text-xs">
                  {documentTitle}.{shareFormat === "pdf" ? "pdf" : "docx"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {shareFormat === "pdf" ? "Attached as portable PDF file" : "Attached as editable Word document file"}
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md shrink-0">
                Attached
              </span>
            </div>
          )}

          {/* 3. Delivery Channel Dropdown */}
          <CustomDropdown
            label="Delivery Channel"
            options={channelOptions}
            value={channel}
            onChange={handleChannelChange}
          />

          {/* 4. Connected Account Dropdown */}
          <CustomDropdown
            label={`From Account (${CHANNEL_CONFIG[channel].label})`}
            options={accountOptions}
            value={connectedAccount}
            onChange={setConnectedAccount}
          />

          {/* 5. Unified Recipients Multi-Select Dropdown */}
          <div className="space-y-1.5 relative" ref={recipientDropdownRef}>
            <label className="block text-xs font-bold text-slate-700" style={LABEL_STYLE}>
              Recipients ({totalRecipientsCount})
            </label>

            {/* Main Interactive Dropdown Trigger Box */}
            <div
              onClick={() => setIsRecipientDropdownOpen((prev) => !prev)}
              className="w-full min-h-[42px] px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            >
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {totalRecipientsCount === 0 ? (
                  <span className="text-xs text-slate-400 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select recipients from list...
                  </span>
                ) : (
                  <>
                    {selectedClients.map((c) => (
                      <span
                        key={c.id}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-lg text-xs font-semibold shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <User className="w-3 h-3 text-blue-600" />
                        <span>{c.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveClient(c.id);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-200 p-0.5 transition-colors cursor-pointer"
                          title="Remove recipient"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {selectedLiterals.map((lit) => (
                      <span
                        key={lit.id}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {channel === "email" ? <Mail className="w-3 h-3 text-slate-600" /> : <MessageSquare className="w-3 h-3 text-slate-600" />}
                        <span>{lit.value}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLiteral(lit.id);
                          }}
                          className="ml-1 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-300 p-0.5 transition-colors cursor-pointer"
                          title="Remove recipient"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </>
                )}
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                  isRecipientDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Dropdown Menu */}
            {isRecipientDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-72 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100 space-y-2"
              >
                <div className="space-y-0.5 max-h-44 overflow-y-auto">
                  {clientOptionsList.map((c) => {
                    const isSelected = selectedClients.some((sc) => sc.id === c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleToggleClient(c.value)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 text-blue-900 font-bold"
                            : "text-slate-700 hover:bg-slate-50 font-medium"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <User className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                          <span className="truncate">{c.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Inline custom recipient input inside dropdown */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <input
                      type={channel === "email" ? "email" : "tel"}
                      value={customInputVal}
                      onChange={(e) => setCustomInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomRecipient();
                        }
                      }}
                      placeholder={channel === "email" ? "Add email address..." : "Add phone number..."}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium bg-white"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomRecipient}
                      disabled={!customInputVal.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs shrink-0"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Channel-specific message body panel */}
          {channel === "sms" && <SmsPanel docUrl={docUrl} docName={documentTitle} format={shareFormat} />}
          {channel === "email" && <EmailPanel docName={documentTitle} docUrl={docUrl} clientName={selectedClients[0]?.name || ""} format={shareFormat} />}
          {channel === "whatsapp" && <WhatsAppPanel onCloseDrawer={onClose} />}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!hasValidRecipient}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#1F2937] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{channelLabels[channel]}</span>
          </button>
        </div>
      </div>
    </>
  );
}
