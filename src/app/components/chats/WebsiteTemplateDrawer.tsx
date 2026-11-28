/**
 * WebsiteTemplateDrawer.tsx
 * Path: src/app/components/chats/WebsiteTemplateDrawer.tsx
 *
 * Side drawer to create or edit reusable Website Live Chat quick-reply templates
 * with slash shortcuts, merge variables, channel scope, and a live Website Widget preview.
 */

import React, { useState, useEffect, useRef } from "react";
import { Globe, MessageSquare, Code, Send, Check } from "lucide-react";
import { toast } from "sonner";
import DrawerShell from "../ui/DrawerShell";
import DocumentSelectFieldsModal from "../ui/DocumentSelectFieldsModal";
import { WebsiteTemplate } from "../../../lib/websiteTemplateStore";
import { WebsiteChannel } from "../../../lib/websiteWidgetStore";

interface WebsiteTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template: WebsiteTemplate | null;
  channels: WebsiteChannel[];
  activeChannelId?: string;
  onSave: (tpl: WebsiteTemplate) => void;
}

const CATEGORIES = ["Greeting", "Scheduling", "Support", "Billing", "Follow-up"];

const SAMPLE_REPLACEMENTS: Array<[string, string]> = [
  ["{{client_name}}", "Alex Rivera"],
  ["{{contact_name}}", "Alex Rivera"],
  ["{{clinic_name}}", "Mantra Health"],
  ["{{doctor_name}}", "Dr. Akshita Sharma"],
  ["{{service_name}}", "Initial Consultation"],
  ["{{appointment_date}}", "Tomorrow"],
  ["{{appointment_time}}", "10:30 AM"],
  ["{{portal_url}}", "https://clinic.mantraassist.com/book"],
];

function resolvePreviewVariables(text: string): string {
  let out = text;
  SAMPLE_REPLACEMENTS.forEach(([token, sample]) => {
    out = out.replaceAll(token, sample);
  });
  return out;
}

export default function WebsiteTemplateDrawer({
  isOpen,
  onClose,
  template,
  channels,
  activeChannelId,
  onSave,
}: WebsiteTemplateDrawerProps) {
  const [name, setName] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [category, setCategory] = useState("Greeting");
  const [channelId, setChannelId] = useState("all");
  const [bodyText, setBodyText] = useState("");
  const [showSelectFieldsModal, setShowSelectFieldsModal] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const initSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      initSessionRef.current = null;
      return;
    }

    const sessionKey = template?.id ? `edit:${template.id}` : `create:${activeChannelId || "all"}`;
    if (initSessionRef.current === sessionKey) return;
    initSessionRef.current = sessionKey;

    if (template) {
      setName(template.name);
      setShortcut(template.shortcut || "");
      setCategory(template.category || "Greeting");
      setChannelId(template.channelId || "all");
      setBodyText(template.bodyText || "");
    } else {
      setName("");
      setShortcut("");
      setCategory("Greeting");
      setChannelId(activeChannelId || "all");
      setBodyText("");
    }
  }, [isOpen, template, activeChannelId]);

  const handleInsertVariable = (token: string) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? bodyText.length;
      const end = textarea.selectionEnd ?? bodyText.length;
      const next = bodyText.slice(0, start) + token + bodyText.slice(end);
      setBodyText(next);
      setTimeout(() => {
        textarea.focus();
        const pos = start + token.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    } else {
      setBodyText((prev) => (prev ? `${prev} ${token}` : token));
    }
    toast.success(`Inserted ${token}`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!bodyText.trim()) {
      toast.error("Please enter the message body");
      return;
    }

    const cleanShortcut = shortcut.trim()
      ? shortcut.trim().startsWith("/")
        ? shortcut.trim().toLowerCase().replace(/\s+/g, "-")
        : `/${shortcut.trim().toLowerCase().replace(/\s+/g, "-")}`
      : `/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reply"}`;

    onSave({
      id: template?.id || `web-tpl-${Date.now()}`,
      name: name.trim(),
      shortcut: cleanShortcut,
      category,
      channelId,
      bodyText: bodyText.trim(),
      lastModified: "Just now",
      createdAt: template?.createdAt || new Date().toISOString().split("T")[0],
    });
    toast.success(template ? "Website template updated" : "Website template created");
    onClose();
  };

  const selectedChannel =
    channels.find((ch) => ch.id === channelId) || channels[0] || null;
  const accentColor = selectedChannel?.themeColor || "#1456f0";
  const widgetTitle = selectedChannel?.botName || selectedChannel?.name || "Website Chat";

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title={template ? "Edit Website Template" : "New Website Template"}
        subtitle="Build reusable live-chat quick replies and greeting messages for your website widget."
        icon={<Globe className="w-4 h-4 text-[#1456f0]" />}
        width="max-w-4xl"
        zIndex={600}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-[#1456f0] hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {template ? "Save Changes" : "Save Template"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left: Form fields stacked vertically */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Appointment Booking Link"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1456f0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slash Shortcut
                </label>
                <input
                  type="text"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="e.g. /book"
                  className="w-full h-10 px-3 text-sm font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1456f0]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Type this shortcut inside live website conversations to insert quickly.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1456f0]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Website Channel
                </label>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1456f0]"
                >
                  <option value="all">All Website Channels</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSelectFieldsModal(true)}
                  className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" /> Insert Variable
                </button>
              </div>
              <textarea
                ref={bodyRef}
                rows={5}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hi {{client_name}}, here is the link to book your consultation: {{portal_url}}"
                className="w-full p-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1456f0] resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Supports dynamic variables like <code className="text-slate-700">{"{{client_name}}"}</code> and{" "}
                <code className="text-slate-700">{"{{clinic_name}}"}</code>.
              </p>
            </div>
          </div>

          {/* Right: Live Website Widget Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 border border-slate-200 rounded-2xl bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Live Widget Preview
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {selectedChannel?.name || "All Websites"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                <div
                  className="px-4 py-3 text-white flex items-center gap-2.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{widgetTitle}</p>
                    <p className="text-[10px] text-white/80 truncate">
                      {selectedChannel?.botSubtitle || "Online · Ready to help"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 space-y-3 bg-slate-50/70 min-h-[220px] flex flex-col justify-end">
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-xs text-xs text-white shadow-2xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      Hi, can you share details about booking an appointment?
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-bl-xs bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs whitespace-pre-wrap leading-relaxed">
                      {bodyText.trim()
                        ? resolvePreviewVariables(bodyText)
                        : "Your website chat template reply will appear here..."}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 border-t border-slate-100 bg-white flex items-center gap-2">
                  <div className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center text-[11px] text-slate-400">
                    Type a message...
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerShell>

      <DocumentSelectFieldsModal
        isOpen={showSelectFieldsModal}
        onClose={() => setShowSelectFieldsModal(false)}
        onInsert={(token) => {
          handleInsertVariable(token);
          setShowSelectFieldsModal(false);
        }}
        title="Insert Merge Variable"
        subtitle="Select a dynamic field to insert into your website template"
      />
    </>
  );
}
