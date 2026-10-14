import React, { useState } from "react";
import { X, Copy, Check, Send, Mail, Phone, QrCode, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Client } from "../../../lib/clientsStore";

interface SendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

export default function SendInviteModal({ isOpen, onClose, client }: SendInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState<{ email: boolean; sms: boolean; whatsapp: boolean }>({
    email: true,
    sms: true,
    whatsapp: false,
  });

  if (!isOpen || !client) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const portalUrl = `${origin}/patient/login?clientId=${encodeURIComponent(client.id)}`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success("Patient portal link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSendInvite = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      const recipient = client.email || client.phone || client.name;
      const sentVia = [
        channels.email && "Email",
        channels.sms && "SMS",
        channels.whatsapp && "WhatsApp",
      ].filter(Boolean).join(" & ") || "Simulated Dispatch";

      toast.success(`Portal invite sent to ${client.name} (${recipient}) via ${sentVia}!`);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Send Patient Portal Invite
              </h2>
              <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                Provide self-service booking, digital bills & check-in access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Patient Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {(client.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {client.name}
                  </h3>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {client.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {client.email || "No email"} • {client.phone || "No phone"}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              {client.status || "Active"}
            </span>
          </div>

          {/* Direct Portal Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Personalized Portal Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 truncate select-all">
                {portalUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  copied
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-2xs"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Preview Patient Portal"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* QR Code Quick Scan Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100 flex items-center gap-4">
            <div className="w-20 h-20 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              {/* Scalable QR icon representation */}
              <div className="w-full h-full border border-slate-200 rounded-lg flex flex-col items-center justify-center p-1 bg-slate-50">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Instant QR Check-in Code
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                Patient can scan this code from their mobile device to instantly verify identity and open the patient portal without typing a password.
              </p>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
              Send Invitation Via
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  channels.email ? "bg-blue-50/60 border-blue-300 text-blue-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={channels.email}
                  onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                  className="rounded border-slate-300 accent-blue-600"
                />
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Email Invitation
                </span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  channels.sms ? "bg-blue-50/60 border-blue-300 text-blue-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={channels.sms}
                  onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                  className="rounded border-slate-300 accent-blue-600"
                />
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  SMS / Text Link
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulated invite dispatch</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendInvite}
              disabled={sending || (!channels.email && !channels.sms && !channels.whatsapp)}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? "Sending..." : "Send Invite"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
