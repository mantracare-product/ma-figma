import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  X,
  Check,
  Sparkles,
  Eye,
  FileEdit,
  Code,
  Tag,
  Clock,
  Layers,
  Copy,
} from "lucide-react";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: "Appointment Reminder" | "Follow-up" | "Welcome / Onboarding" | "Billing" | "Clinical Care";
  bodyText: string;
  preheader?: string;
  lastModified: string;
  createdAt: string;
}

export const EMAIL_TEMPLATE_CATEGORIES: EmailTemplate["category"][] = [
  "Appointment Reminder",
  "Follow-up",
  "Welcome / Onboarding",
  "Billing",
  "Clinical Care",
];

const MERGE_VARIABLES = [
  { token: "{{client_name}}", label: "Client Name", sample: "Sarah Jenkins" },
  { token: "{{doctor_name}}", label: "Doctor / Provider", sample: "Dr. Ananya Sharma" },
  { token: "{{appointment_date}}", label: "Appointment Date", sample: "October 24, 2026" },
  { token: "{{appointment_time}}", label: "Appointment Time", sample: "11:00 AM IST" },
  { token: "{{clinic_name}}", label: "Clinic / Facility", sample: "Mantra Care" },
  { token: "{{service_name}}", label: "Service", sample: "Psychological Consultation" },
  { token: "{{portal_url}}", label: "Portal Link", sample: "https://portal.mantra.care/login" },
];

interface EmailTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template?: EmailTemplate | null;
  onSave: (template: EmailTemplate) => void;
}

export default function EmailTemplateDrawer({
  isOpen,
  onClose,
  template,
  onSave,
}: EmailTemplateDrawerProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<EmailTemplate["category"]>("Appointment Reminder");
  const [preheader, setPreheader] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setCategory(template.category);
      setPreheader(template.preheader || "");
      setBodyText(template.bodyText);
    } else {
      setName("");
      setSubject("");
      setCategory("Appointment Reminder");
      setPreheader("");
      setBodyText(
        "Hi {{client_name}},\n\nThis is a confirmation for your upcoming session with {{doctor_name}} at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}.\n\nPlease let us know if you need to reschedule or have any questions.\n\nWarm regards,\n{{clinic_name}} Team"
      );
    }
    setActiveTab("compose");
  }, [template, isOpen]);

  const insertVariable = (token: string) => {
    if (lastFocusedField === "subject") {
      setSubject((prev) => prev + " " + token);
    } else {
      setBodyText((prev) => prev + " " + token);
    }
    toast.success(`Inserted ${token}`);
  };

  const getResolvedPreview = (text: string) => {
    let resolved = text;
    MERGE_VARIABLES.forEach((v) => {
      resolved = resolved.replaceAll(v.token, v.sample);
    });
    return resolved;
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter an email subject line");
      return;
    }
    if (!bodyText.trim()) {
      toast.error("Please enter email body content");
      return;
    }

    const nowFormatted =
      "Today at " +
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newTemplate: EmailTemplate = {
      id: template?.id || `em-tpl-${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      category,
      preheader: preheader.trim() || undefined,
      bodyText,
      lastModified: nowFormatted,
      createdAt: template?.createdAt || new Date().toISOString().split("T")[0],
    };

    onSave(newTemplate);
    toast.success(template ? "Email template updated" : "Email template created");
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center font-bold text-sm shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {template ? "Edit Email Template" : "New Email Template"}
            </h3>
            <p className="text-[11px] text-gray-500">
              Create reusable email content with dynamic merge variables
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Template</span>
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-5" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Tab Toggle: Compose vs Live Preview */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="inline-flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "compose"
                  ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                  : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Compose</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                  : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <span className="text-[11px] text-gray-400 font-mono tabular-nums">
            Markdown supported
          </span>
        </div>

        {activeTab === "compose" ? (
          <div className="space-y-4">
            {/* Template Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Post-Consultation Follow Up"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs cursor-pointer"
                >
                  {EMAIL_TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Subject Line <span className="text-red-500">*</span>
              </label>
              <input
                ref={subjectInputRef}
                type="text"
                placeholder="e.g., Your Care Plan Summary with {{doctor_name}}"
                value={subject}
                onFocus={() => setLastFocusedField("subject")}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Preheader Preview Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Preheader Text
                </label>
                <span className="text-[10px] text-gray-400">Preview snippet shown in recipient inbox</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Summary and action steps following your visit"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Merge Variables Quick Chips */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Insert Merge Variables</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Click to insert into {lastFocusedField}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-[11px] font-mono text-slate-700 hover:text-[#0284C7] hover:border-sky-300 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title={`Sample value: "${v.sample}"`}
                  >
                    <span>{v.token}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Email Body <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={bodyInputRef}
                rows={9}
                value={bodyText}
                onFocus={() => setLastFocusedField("body")}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Write your email template message here..."
                className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs font-sans leading-relaxed resize-y"
              />
            </div>
          </div>
        ) : (
          /* Live Preview View */
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
              {/* Fake Email Client Chrome Header */}
              <div className="bg-slate-50 border-b border-gray-200 p-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16 text-right">From:</span>
                  <span className="font-semibold text-slate-800">Navodya Jain &lt;navodya@mantra.care&gt;</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16 text-right">To:</span>
                  <span className="text-slate-700">Sarah Jenkins &lt;sarah.j@example.com&gt;</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16 text-right">Subject:</span>
                  <span className="font-bold text-[#1E293B]">
                    {getResolvedPreview(subject) || "(No Subject)"}
                  </span>
                </div>
                {preheader && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-bold w-16 text-right">Preheader:</span>
                    <span className="italic">{preheader}</span>
                  </div>
                )}
              </div>

              {/* Email Content Body Preview */}
              <div className="p-6 bg-white min-h-[260px] text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {getResolvedPreview(bodyText) || "(No content)"}
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-[11px] text-[#0284C7] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Variables are automatically substituted with client and session metadata upon sending.</span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
