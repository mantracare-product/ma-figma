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
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
} from "lucide-react";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";
import DocumentSelectFieldsModal from "../ui/DocumentSelectFieldsModal";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  bodyText: string;
  preheader?: string;
  lastModified: string;
  createdAt: string;
}

export const EMAIL_TEMPLATE_CATEGORIES: string[] = [
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
  const [category, setCategory] = useState<string>("Appointment Reminder");
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("emailTemplateCategories");
      return saved ? JSON.parse(saved) : EMAIL_TEMPLATE_CATEGORIES;
    } catch {
      return EMAIL_TEMPLATE_CATEGORIES;
    }
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [bodyText, setBodyText] = useState("");
  const [bodyMode, setBodyMode] = useState<"rich" | "html">("rich");
  const [htmlTab, setHtmlTab] = useState<"code" | "preview">("code");
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [variableTarget, setVariableTarget] = useState<"subject" | "body">("body");

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setCategory(template.category);
      setBodyText(template.bodyText);
      if (template.bodyText && /<[a-z][\s\S]*>/i.test(template.bodyText)) {
        setBodyMode("html");
      } else {
        setBodyMode("rich");
      }
    } else {
      setName("");
      setSubject("");
      setCategory("Appointment Reminder");
      setBodyText(
        "Hi {{client_name}},\n\nThis is a confirmation for your upcoming session with {{doctor_name}} at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}.\n\nPlease let us know if you need to reschedule or have any questions.\n\nWarm regards,\n{{clinic_name}} Team"
      );
      setBodyMode("rich");
    }
    setHtmlTab("code");
    setActiveTab("compose");
    setIsAddingCategory(false);
    setNewCategoryName("");
  }, [template, isOpen]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
      return;
    }
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      try {
        localStorage.setItem("emailTemplateCategories", JSON.stringify(updated));
      } catch {}
    }
    setCategory(trimmed);
    setNewCategoryName("");
    setIsAddingCategory(false);
    toast.success(`Category "${trimmed}" added and selected`);
  };

  const applyFormat = (prefix: string, suffix: string, defaultText = "text") => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = bodyText.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newBody = bodyText.substring(0, start) + replacement + bodyText.substring(end);
    setBodyText(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const applyList = (ordered = false) => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = bodyText.substring(start, end);
    if (selected) {
      const lines = selected.split("\n");
      const formatted = lines.map((l, i) => (ordered ? `${i + 1}. ${l}` : `• ${l}`)).join("\n");
      const newBody = bodyText.substring(0, start) + formatted + bodyText.substring(end);
      setBodyText(newBody);
    } else {
      const bullet = ordered ? "\n1. Item 1\n2. Item 2\n" : "\n• Item 1\n• Item 2\n";
      setBodyText((prev) => (prev ? prev + bullet : bullet));
    }
  };

  const applyLink = () => {
    const url = window.prompt("Enter link URL:", "https://");
    if (!url) return;
    applyFormat(`<a href="${url}" style="color: #0284c7; text-decoration: underline;">`, "</a>", "link text");
  };

  const handleInsertHtmlTemplate = () => {
    const htmlTemplate = `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.6;">
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Thank you for choosing <strong>{{clinic_name}}</strong>.</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
    <strong style="color: #0284c7;">Session Details:</strong><br />
    Provider: <strong>{{doctor_name}}</strong><br />
    Date: <strong>{{appointment_date}}</strong> at <strong>{{appointment_time}}</strong><br />
    Service: <strong>{{service_name}}</strong>
  </div>
  <p>You can access your patient portal here: <a href="{{portal_url}}" style="color: #0284c7; text-decoration: underline;">Open Portal</a></p>
  <p>Warm regards,<br /><strong>{{clinic_name}} Team</strong></p>
</div>`;
    setBodyText((prev) => (prev ? prev + "\n\n" + htmlTemplate : htmlTemplate));
    toast.success("HTML block template inserted");
  };

  const handleInsertVariable = (token: string) => {
    if (variableTarget === "subject") {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? subject.length;
        const end = input.selectionEnd ?? subject.length;
        const next = subject.slice(0, start) + token + subject.slice(end);
        setSubject(next);
        setTimeout(() => {
          input.focus();
          const pos = start + token.length;
          input.setSelectionRange(pos, pos);
        }, 0);
      } else {
        setSubject((prev) => (prev ? prev + " " + token : token));
      }
    } else {
      const textarea = bodyInputRef.current;
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
        setBodyText((prev) => (prev ? prev + " " + token : token));
      }
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory((v) => !v)}
                    className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingCategory ? "Cancel" : "Add Category"}</span>
                  </button>
                </div>

                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] bg-white shadow-2xs font-medium"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="px-3 py-1.5 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setIsAddingCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__add_new__">+ Add new category...</option>
                  </select>
                )}
              </div>
            </div>

            {/* Subject Line with Insert Variable */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Subject Line <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setVariableTarget("subject");
                    setIsVariableModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span className="font-mono">{`{ }`}</span>
                  <span>Insert Variable</span>
                </button>
              </div>
              <input
                ref={subjectInputRef}
                type="text"
                placeholder="e.g., Your Care Plan Summary with {{doctor_name}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7] bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Email Body with Mode Switcher & Insert Variable */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Email Body <span className="text-red-500">*</span>
                  </label>
                  <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setBodyMode("rich")}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all ${
                        bodyMode === "rich"
                          ? "bg-white text-slate-800 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Rich Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBodyMode("html");
                        setHtmlTab("code");
                      }}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all ${
                        bodyMode === "html"
                          ? "bg-white text-slate-800 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      HTML Block
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVariableTarget("body");
                    setIsVariableModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span className="font-mono">{`{ }`}</span>
                  <span>Insert Variable</span>
                </button>
              </div>

              {bodyMode === "rich" ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1.5 flex-wrap text-slate-600">
                    <button
                      type="button"
                      onClick={() => applyFormat("<b>", "</b>", "Bold text")}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat("<i>", "</i>", "Italic text")}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat("<u>", "</u>", "Underlined text")}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat("<s>", "</s>", "Strikethrough text")}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-3.5 w-px bg-gray-300 mx-1" />

                    <button
                      type="button"
                      onClick={() => applyList(false)}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyList(true)}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={applyLink}
                      className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    ref={bodyInputRef}
                    rows={12}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Write your email template message here..."
                    className="w-full p-4 text-xs text-gray-800 focus:outline-none resize-y font-medium leading-relaxed font-sans"
                  />
                </div>
              ) : (
                /* HTML Block mode with preview in HTML block only */
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <Code className="w-3.5 h-3.5 text-indigo-600" />
                      <span>HTML Template Body</span>
                    </div>

                    <div className="inline-flex items-center p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setHtmlTab("code")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                          htmlTab === "code"
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setHtmlTab("preview")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all ${
                          htmlTab === "preview"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>

                  {htmlTab === "code" ? (
                    <div className="relative">
                      <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono">Write or paste HTML code</span>
                        <button
                          type="button"
                          onClick={handleInsertHtmlTemplate}
                          className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          Insert HTML Template
                        </button>
                      </div>
                      <textarea
                        ref={bodyInputRef}
                        rows={12}
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="<div>...</div>"
                        className="w-full p-4 text-xs text-slate-800 font-mono bg-slate-50/30 focus:outline-none resize-y leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="p-5 bg-white min-h-[220px] text-xs text-slate-800 leading-relaxed overflow-x-auto">
                      {bodyText.trim() ? (
                        <div dangerouslySetInnerHTML={{ __html: getResolvedPreview(bodyText) }} />
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          No HTML content to preview. Switch to HTML tab to write code.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
              </div>

              {/* Email Content Body Preview */}
              <div className="p-6 bg-white min-h-[260px] text-xs text-slate-800 leading-relaxed font-sans">
                {bodyText.trim() ? (
                  bodyMode === "html" || /<[a-z][\s\S]*>/i.test(bodyText) ? (
                    <div dangerouslySetInnerHTML={{ __html: getResolvedPreview(bodyText) }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{getResolvedPreview(bodyText)}</div>
                  )
                ) : (
                  <span className="text-gray-400 italic">(No content)</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-[11px] text-[#0284C7] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Variables are automatically substituted with client and session metadata upon sending.</span>
            </div>
          </div>
        )}
      </div>

      <DocumentSelectFieldsModal
        isOpen={isVariableModalOpen}
        onClose={() => setIsVariableModalOpen(false)}
        onInsert={handleInsertVariable}
        title="Select Fields"
        subtitle="Insert placeholder variables into your email template"
        tokenFormat="double_curly"
      />
    </Drawer>
  );
}
