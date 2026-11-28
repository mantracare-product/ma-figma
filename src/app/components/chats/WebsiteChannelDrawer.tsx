/**
 * WebsiteChannelDrawer.tsx
 * Path: src/app/components/chats/WebsiteChannelDrawer.tsx
 *
 * Side drawer to create or edit a Website Chat Channel using the same clean accordion
 * layout as WhatsAppAgentDrawer, plus Embed Script, Allowed Websites, Appearance
 * (including Chatbot Profile Pic), Position, and an interactive Live Preview.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import DrawerShell from "../ui/DrawerShell";
import {
  Activity,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Globe,
  Headphones,
  Heart,
  HelpCircle,
  Info,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { getStoredTeamMembers, TeamMember } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  WebsiteChannel,
  DEFAULT_WIDGET_CONFIG,
  buildWebsiteEmbedScript,
  generateWebsiteScriptKey,
} from "../../../lib/websiteWidgetStore";

export interface WebsiteChannelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: WebsiteChannel | null;
  canDelete?: boolean;
  onSave: (channel: WebsiteChannel) => void;
  onDelete?: (channelId: string) => void;
}

const PRESET_COLORS = [
  "#1456f0",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#1E293B",
];

const LAUNCHER_ICON_LIBRARY = [
  { id: "chat", label: "Chat Bubble", keywords: "chat bubble round", Icon: MessageCircle },
  { id: "message", label: "Message Box", keywords: "message square text", Icon: MessageSquare },
  { id: "bot", label: "AI Bot", keywords: "bot robot ai assistant", Icon: Bot },
  { id: "sparkles", label: "Smart AI", keywords: "sparkles magic ai", Icon: Sparkles },
  { id: "headset", label: "Support Desk", keywords: "headset support agent helpdesk", Icon: Headphones },
  { id: "stethoscope", label: "Clinical Care", keywords: "stethoscope medical doctor clinic", Icon: Stethoscope },
  { id: "calendar", label: "Appointments", keywords: "calendar booking schedule", Icon: Calendar },
  { id: "phone", label: "Call & Chat", keywords: "phone call contact", Icon: PhoneCall },
  { id: "help", label: "Help Center", keywords: "help question faq", Icon: HelpCircle },
  { id: "send", label: "Quick Send", keywords: "send paper plane", Icon: Send },
  { id: "smile", label: "Friendly", keywords: "smile greeting welcome", Icon: Smile },
  { id: "heart", label: "Patient Care", keywords: "heart health care", Icon: Heart },
  { id: "shield", label: "Verified Desk", keywords: "shield secure trust", Icon: ShieldCheck },
  { id: "activity", label: "Health Pulse", keywords: "pulse activity vitals", Icon: Activity },
  { id: "globe", label: "Website Web", keywords: "globe web site", Icon: Globe },
  { id: "zap", label: "Instant Reply", keywords: "zap fast instant", Icon: Zap },
] as const;

function getChatbotInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "WC";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const POSITION_OPTIONS: Array<{
  id: WebsiteChannel["position"];
  label: string;
}> = [
  { id: "top-left", label: "Top Left" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text} position="top">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="inline-flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 cursor-help transition-colors ml-1.5"
      >
        <Info className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  );
}

export default function WebsiteChannelDrawer({
  isOpen,
  onClose,
  channel,
  canDelete = true,
  onSave,
  onDelete,
}: WebsiteChannelDrawerProps) {
  const isEditing = Boolean(channel);

  const [openSection, setOpenSection] = useState<number | null>(1);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // ── 1. Name & Headline (Channel Name = Chatbot Display Name) ──
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("Online · Ready to help");
  const [scriptKey, setScriptKey] = useState("");
  const [allowedWebsites, setAllowedWebsites] = useState<string[]>([]);
  const [newSiteUrl, setNewSiteUrl] = useState("");

  // ── 2. Appearance & Chatbot Profile ──
  const [botAvatar, setBotAvatar] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(
    DEFAULT_WIDGET_CONFIG.welcomeMessage
  );
  const [themeColor, setThemeColor] = useState(DEFAULT_WIDGET_CONFIG.themeColor);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    DEFAULT_WIDGET_CONFIG.themeMode
  );
  const [launcherIcon, setLauncherIcon] = useState<string>("chat");
  const [launcherDropdownOpen, setLauncherDropdownOpen] = useState(false);
  const [launcherIconSearch, setLauncherIconSearch] = useState("");
  const launcherDropdownRef = useRef<HTMLDivElement>(null);
  const [autoWelcomeMode, setAutoWelcomeMode] = useState<"all" | "selected" | "off">("all");
  const [autoWelcomeDelay, setAutoWelcomeDelay] = useState<
    "immediate" | "3s" | "5s" | "10s" | "30s"
  >("immediate");
  const [autoWelcomeExcludedPages, setAutoWelcomeExcludedPages] = useState<string[]>([]);
  const [newExcludedPage, setNewExcludedPage] = useState("");
  const [customWelcomeMessages, setCustomWelcomeMessages] = useState<
    Array<{ id: string; pagePattern: string; message: string }>
  >([]);
  const [removeSignature, setRemoveSignature] = useState(false);

  // ── 3. Position ──
  const [position, setPosition] = useState<WebsiteChannel["position"]>("bottom-right");

  // ── 4. Pre-chat & Routing ──
  const [enablePreChatForm, setEnablePreChatForm] = useState(true);
  const [preChatTiming, setPreChatTiming] = useState<"before_chat" | "after_first_message">(
    "after_first_message"
  );
  const [showOnlineMembers, setShowOnlineMembers] = useState(true);
  const [formFields, setFormFields] = useState({
    name: true,
    email: true,
    phone: true,
    requirement: true,
  });
  const [firstResponder, setFirstResponder] = useState<"ai" | "human">("ai");
  const [agentQueue, setAgentQueue] = useState<string[]>([]);
  const [customProfiles, setCustomProfiles] = useState<
    Record<string, { name?: string; position?: string; image?: string }>
  >({});
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  const { activeOrganization } = useOrganization();
  const orgTeamMembers = useMemo<TeamMember[]>(() => {
    const all = getStoredTeamMembers().filter((m) => m.status !== false);
    if (!activeOrganization?.id) return all;
    const matched = all.filter(
      (m) => !m.organizationId || String(m.organizationId) === String(activeOrganization.id)
    );
    return matched.length > 0 ? matched : all;
  }, [activeOrganization?.id, isOpen]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewVisitorName, setPreviewVisitorName] = useState("");
  const [previewVisitorEmail, setPreviewVisitorEmail] = useState("");
  const [previewVisitorPhone, setPreviewVisitorPhone] = useState("");
  const [previewMessageInput, setPreviewMessageInput] = useState("");
  const initSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (launcherDropdownRef.current && !launcherDropdownRef.current.contains(e.target as Node)) {
        setLauncherDropdownOpen(false);
      }
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      initSessionRef.current = null;
      return;
    }

    const sessionKey = channel?.id ? `edit:${channel.id}` : "create";
    if (initSessionRef.current === sessionKey) {
      return;
    }
    initSessionRef.current = sessionKey;

    setErrors({});
    setNewSiteUrl("");
    setPreviewExpanded(true);
    setLauncherDropdownOpen(false);
    setLauncherIconSearch("");
    setTeamDropdownOpen(false);
    setPreviewVisitorName("");
    setPreviewVisitorEmail("");
    setPreviewVisitorPhone("");
    setPreviewMessageInput("");

    if (channel) {
      setName(channel.name || channel.botName || "");
      setHeadline(channel.botSubtitle || channel.description || "Online · Ready to help");
      setScriptKey(channel.scriptKey || generateWebsiteScriptKey());
      setAllowedWebsites((channel.allowedWebsites || []).slice(0, 1));
      setBotAvatar(channel.botAvatar || "");
      setWelcomeMessage(channel.welcomeMessage || DEFAULT_WIDGET_CONFIG.welcomeMessage);
      setThemeColor(channel.themeColor || DEFAULT_WIDGET_CONFIG.themeColor);
      setThemeMode(channel.themeMode || "light");
      setLauncherIcon(channel.launcherIcon || "chat");
      setAutoWelcomeMode(channel.autoWelcomeMode || "all");
      setAutoWelcomeDelay(channel.autoWelcomeDelay || "immediate");
      setAutoWelcomeExcludedPages(
        Array.isArray(channel.autoWelcomeExcludedPages) ? channel.autoWelcomeExcludedPages : []
      );
      setCustomWelcomeMessages(
        Array.isArray(channel.customWelcomeMessages) ? channel.customWelcomeMessages : []
      );
      setNewExcludedPage("");
      setRemoveSignature(Boolean(channel.removeSignature));
      setPosition(channel.position || "bottom-right");
      setEnablePreChatForm(channel.enablePreChatForm !== false);
      setPreChatTiming(channel.preChatTiming || "after_first_message");
      setShowOnlineMembers(channel.showOnlineMembers !== false);
      setFormFields({
        name: channel.formFields?.name ?? true,
        email: channel.formFields?.email ?? true,
        phone: channel.formFields?.phone ?? true,
        requirement: channel.formFields?.requirement ?? true,
      });
      setFirstResponder(channel.firstResponder || "ai");
      setAgentQueue(Array.isArray(channel.agentQueue) ? channel.agentQueue.map(String) : []);
      setCustomProfiles(channel.customProfiles || {});
      setOpenSection(1);
    } else {
      setName("");
      setHeadline("Online · Ready to help");
      setScriptKey(generateWebsiteScriptKey());
      setAllowedWebsites([]);
      setBotAvatar("");
      setWelcomeMessage("Hello! Welcome to Mantra Health. How can we assist you today?");
      setThemeColor("#1456f0");
      setThemeMode("light");
      setLauncherIcon("chat");
      setAutoWelcomeMode("all");
      setAutoWelcomeDelay("immediate");
      setAutoWelcomeExcludedPages([]);
      setCustomWelcomeMessages([]);
      setNewExcludedPage("");
      setRemoveSignature(false);
      setPosition("bottom-right");
      setEnablePreChatForm(true);
      setPreChatTiming("after_first_message");
      setShowOnlineMembers(true);
      setFormFields({ name: true, email: true, phone: true, requirement: true });
      setFirstResponder("ai");
      setAgentQueue([]);
      setCustomProfiles({});
      setOpenSection(1);
    }
  }, [channel, isOpen]);

  const handleToggleTeamMember = (memberId: string) => {
    setAgentQueue((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleTeamMemberAvatarUpload = (memberId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomProfiles((prev) => ({
          ...prev,
          [memberId]: {
            ...(prev[memberId] || {}),
            image: reader.result as string,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const embedScript = useMemo(() => buildWebsiteEmbedScript(scriptKey), [scriptKey]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(embedScript);
    setCopiedCode(true);
    toast.success("Embed script copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleAddSite = () => {
    const raw = newSiteUrl.trim();
    if (!raw) return;
    if (allowedWebsites.length >= 1) {
      toast.error("Only 1 allowed website can be added per channel");
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : `https://${raw.replace(/\/+$/, "")}`;
    if (allowedWebsites.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
      toast.error("Website already in allowed list");
      return;
    }
    setAllowedWebsites((prev) => [...prev, normalized]);
    setNewSiteUrl("");
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBotAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSection = (sec: number) => {
    setOpenSection((prev) => (prev === sec ? null : sec));
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) {
      nextErrors.name = "Channel name is required.";
      setOpenSection(1);
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please enter a channel name before saving.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedHeadline = headline.trim() || "Online · Ready to help";

    const savedChannel: WebsiteChannel = {
      ...(channel || DEFAULT_WIDGET_CONFIG),
      id: channel?.id || `web-ch-${Date.now()}`,
      name: trimmedName,
      description: trimmedHeadline,
      scriptKey,
      allowedWebsites: allowedWebsites.slice(0, 1),
      themeColor,
      themeMode,
      botName: trimmedName,
      botSubtitle: trimmedHeadline,
      botAvatar: botAvatar || "",
      launcherIcon,
      welcomeMessage:
        welcomeMessage.trim() || "Hello! Welcome to Mantra Health. How can we assist you today?",
      autoWelcomeMode,
      autoWelcomeDelay,
      autoWelcomeExcludedPages,
      customWelcomeMessages,
      removeSignature,
      position,
      enablePreChatForm,
      preChatTiming,
      showOnlineMembers,
      formFields: {
        ...formFields,
        processSelect: false,
      },
      autoCreateClientEnabled: false,
      autoCreateContactCategory: "",
      firstResponder,
      agentQueue,
      customProfiles,
      isActive: channel?.isActive ?? true,
      createdAt: channel?.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    onSave(savedChannel);
    toast.success(`Website channel "${savedChannel.name}" saved`);
    onClose();
  };

  const isSection1Valid = Boolean(name.trim());
  const isSection2Valid = Boolean(welcomeMessage.trim());
  const isSection3Valid = Boolean(position);

  const selectedLauncherEntry = useMemo(
    () => LAUNCHER_ICON_LIBRARY.find((item) => item.id === launcherIcon) || LAUNCHER_ICON_LIBRARY[0],
    [launcherIcon]
  );

  const filteredLauncherIcons = useMemo(() => {
    const q = launcherIconSearch.trim().toLowerCase();
    if (!q) return LAUNCHER_ICON_LIBRARY;
    return LAUNCHER_ICON_LIBRARY.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [launcherIconSearch]);

  const botInitials = useMemo(() => getChatbotInitials(name), [name]);

  const handleAddExcludedPage = () => {
    const raw = newExcludedPage.trim();
    if (!raw) return;
    if (autoWelcomeExcludedPages.some((p) => p.toLowerCase() === raw.toLowerCase())) {
      toast.error("Page rule already excluded");
      return;
    }
    setAutoWelcomeExcludedPages((prev) => [...prev, raw]);
    setNewExcludedPage("");
  };

  const handleAddCustomWelcome = () => {
    setCustomWelcomeMessages((prev) => [
      ...prev,
      { id: `cwm-${Date.now()}`, pagePattern: "", message: "" },
    ]);
  };

  const renderLauncherGlyph = (sizeClass = "w-5 h-5") => {
    const { Icon } = selectedLauncherEntry;
    return <Icon className={sizeClass} />;
  };

  const launcherAnchorClass = useMemo(() => {
    const v = position.startsWith("top") ? "top-3" : "bottom-3";
    const h = position.endsWith("left")
      ? "left-3"
      : position.endsWith("right")
      ? "right-3"
      : "left-1/2 -translate-x-1/2";
    return `${v} ${h}`;
  }, [position]);

  const cardAnchorClass = useMemo(() => {
    const h = position.endsWith("left")
      ? "items-start"
      : position.endsWith("right")
      ? "items-end"
      : "items-center";
    const v = position.startsWith("top") ? "justify-start pt-12" : "justify-end pb-12";
    return `${h} ${v}`;
  }, [position]);

  const previewDomain = allowedWebsites[0]?.replace(/^https?:\/\//i, "") || "clinic.com";

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Website Channel" : "New Website Channel"}
      subtitle="Configure your website chat script, allowed domains, chatbot appearance, and live widget preview."
      icon={<Globe className="w-4 h-4 text-[#6366F1]" />}
      width="w-full max-w-5xl xl:max-w-[1140px]"
      bodyClassName="pt-4 px-6 pb-6 overflow-y-auto overflow-x-hidden"
      zIndex={600}
      footer={
        <div className="flex items-center justify-between w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div>
            {isEditing && onDelete && channel && canDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(channel.id);
                  toast.success(`Website channel "${channel.name}" deleted`);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Channel</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditing ? "Save Channel" : "Create Channel"}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── Left Column: WhatsApp-style Collapsible Accordion Sections ── */}
        <div className="lg:col-span-7 space-y-3.5 min-w-0">
          {/* ── SECTION 1: NAME & DESCRIPTION ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 1 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(1)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 1 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">1. Name</span>
              <div className="flex items-center gap-2">
                {isSection1Valid && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 1 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 1 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Channel / Chatbot name</span>
                    <span className="text-red-500 ml-0.5">*</span>
                    <InfoTip text="Shown in the Website channel dropdown and as the chatbot name in the widget header." />
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Main Clinic Website"
                    className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                      errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200 text-slate-900"
                    }`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Headline</span>
                    <InfoTip text="Shown directly below the chatbot name inside the widget header." />
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Online · Ready to help"
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: APPEARANCE & CHATBOT PROFILE PIC ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 2 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(2)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 2 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">2. Appearance &amp; Chatbot Profile</span>
              <div className="flex items-center gap-2">
                {isSection2Valid && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 2 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 2 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                {/* Chatbot Profile Picture (Simple Upload Field) */}
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Chatbot profile picture</span>
                    <InfoTip text="Upload a custom image for your chatbot. When left empty, its initials appear in the preview." />
                  </label>
                  <div className="h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {botAvatar && (
                        <img
                          src={botAvatar}
                          alt={name || "Chatbot avatar"}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <span className={`text-sm truncate ${botAvatar ? "text-slate-800 font-medium" : "text-slate-400"}`}>
                        {botAvatar ? "Profile picture uploaded" : "Upload profile picture..."}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-[#1456f0]" />
                        <span>{botAvatar ? "Change" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                      {botAvatar && (
                        <button
                          type="button"
                          onClick={() => setBotAvatar("")}
                          className="px-2 py-1 rounded-md text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Primary color</span>
                  </label>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: color,
                          borderColor: themeColor === color ? "#0F172A" : "transparent",
                        }}
                      >
                        {themeColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                    <div className="inline-flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50/60">
                      <input
                        type="color"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="w-5 h-5 cursor-pointer border-none bg-transparent p-0"
                        title="Custom color"
                      />
                      <span className="text-[11px] font-mono text-slate-600 uppercase">
                        {themeColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Theme Mode */}
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Theme mode</span>
                  </label>
                  <select
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value as "light" | "dark")}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>

                {/* Launcher Icon Rich Library Dropdown */}
                <div className="relative" ref={launcherDropdownRef}>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Launcher icon</span>
                    <InfoTip text="Choose an icon from the library for the floating chat button on your website." />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLauncherDropdownOpen((v) => !v)}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-sm text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <selectedLauncherEntry.Icon className="w-4 h-4 text-[#1456f0] shrink-0" />
                      <span className="truncate font-medium">{selectedLauncherEntry.label}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        launcherDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {launcherDropdownOpen && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={launcherIconSearch}
                          onChange={(e) => setLauncherIconSearch(e.target.value)}
                          placeholder="Search icon library..."
                          className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="p-2 grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
                        {filteredLauncherIcons.map(({ id, label, Icon }) => {
                          const active = launcherIcon === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setLauncherIcon(id);
                                setLauncherDropdownOpen(false);
                              }}
                              title={label}
                              className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                                active
                                  ? "border-[#1456f0] bg-blue-50/80 text-[#1456f0]"
                                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="truncate w-full text-center">{label.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                        {filteredLauncherIcons.length === 0 && (
                          <div className="col-span-4 py-4 text-center text-xs text-slate-400">
                            No matching icons
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hide Signature Toggle */}
                <label className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <span className="text-[13px] font-medium text-slate-700">
                    Hide MantraAssist signature
                  </span>
                  <input
                    type="checkbox"
                    checked={removeSignature}
                    onChange={(e) => setRemoveSignature(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1456f0] cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* ── SECTION 3: POSITION ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 3 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(3)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 3 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">3. Position</span>
              <div className="flex items-center gap-2">
                {isSection3Valid && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 3 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 3 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-slate-700">
                      Widget screen position
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">{position}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {POSITION_OPTIONS.map((pos) => {
                      const active = position === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setPosition(pos.id)}
                          className={`relative h-16 rounded-xl border-2 p-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            active
                              ? "border-[#1456f0] bg-blue-50/50 ring-2 ring-[#1456f0]/15"
                              : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-semibold text-slate-700">{pos.label}</span>
                            {active && <Check className="w-3 h-3 text-[#1456f0]" />}
                          </div>
                          {active && (
                            <span
                              className="absolute w-4 h-4 rounded-full shadow-xs"
                              style={{
                                backgroundColor: themeColor,
                                top: pos.id.startsWith("top") ? "6px" : undefined,
                                bottom: pos.id.startsWith("bottom") ? "6px" : undefined,
                                left: pos.id.endsWith("left")
                                  ? "8px"
                                  : pos.id.endsWith("center")
                                  ? "calc(50% - 8px)"
                                  : undefined,
                                right: pos.id.endsWith("right") ? "8px" : undefined,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 4: PRE-CHAT & ROUTING ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 4 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(4)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 4 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">4. Pre-chat Form &amp; Routing</span>
              <div className="flex items-center gap-2">
                {openSection === 4 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 4 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Collect visitor details before chat
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Show intake form fields inside the website chat widget
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePreChatForm}
                    onChange={(e) => setEnablePreChatForm(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1456f0] cursor-pointer"
                  />
                </label>

                {enablePreChatForm && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { key: "name", label: "Full Name" },
                          { key: "email", label: "Email" },
                          { key: "phone", label: "Phone" },
                          { key: "requirement", label: "Requirement" },
                        ] as const
                      ).map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={formFields[item.key]}
                            onChange={(e) =>
                              setFormFields((prev) => ({ ...prev, [item.key]: e.target.checked }))
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#1456f0]"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>

                    <div>
                      <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                        <span>Show form</span>
                      </label>
                      <select
                        value={preChatTiming}
                        onChange={(e) =>
                          setPreChatTiming(e.target.value as "before_chat" | "after_first_message")
                        }
                        className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                      >
                        <option value="after_first_message">
                          Wait for customer&apos;s first message
                        </option>
                        <option value="before_chat">Before the chat starts</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        {preChatTiming === "after_first_message"
                          ? "The form will show up once the customer has posted their first message."
                          : "The form will show immediately before the customer sends their first message."}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>First responder</span>
                  </label>
                  <select
                    value={firstResponder}
                    onChange={(e) => setFirstResponder(e.target.value as "ai" | "human")}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="ai">AI Agent</option>
                    <option value="human">Human Team Member</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 5: TEAM MEMBERS ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 5 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(5)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 5 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">5. Team Members</span>
              <div className="flex items-center gap-2">
                {agentQueue.length > 0 && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 5 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 5 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[13px] font-medium text-slate-700 block">
                      Team members
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Assign team members to this channel and customize their chat photo or avatar.
                    </span>
                  </div>

                  <div className="relative" ref={teamDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setTeamDropdownOpen((o) => !o)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 flex items-center justify-between text-sm text-slate-700 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>
                          {agentQueue.length > 0
                            ? `${agentQueue.length} team member${agentQueue.length > 1 ? "s" : ""} selected`
                            : "Select team members"}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          teamDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {teamDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 max-h-56 overflow-y-auto space-y-0.5">
                        {orgTeamMembers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            No active team members found.
                          </div>
                        ) : (
                          orgTeamMembers.map((member) => {
                            const memberId = String(member.id);
                            const isSelected = agentQueue.includes(memberId);
                            const memberAvatar = customProfiles[memberId]?.image;
                            const initials = member.name
                              .split(/\s+/)
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <button
                                key={memberId}
                                type="button"
                                onClick={() => handleToggleTeamMember(memberId)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-blue-50/70 text-[#1456f0] font-semibold"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                                    {memberAvatar ? (
                                      <img
                                        src={memberAvatar}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      initials
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate">{member.name}</span>
                                    <span className="block text-[10px] text-slate-400 truncate font-normal">
                                      {member.role || member.email}
                                    </span>
                                  </span>
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {agentQueue.length > 0 && (
                    <div className="space-y-2">
                      {agentQueue.map((memberId) => {
                        const member = orgTeamMembers.find((m) => String(m.id) === memberId);
                        const memberName = member?.name || customProfiles[memberId]?.name || `Team Member #${memberId}`;
                        const memberSub = member?.role || member?.email || "Team Member";
                        const avatarUrl = customProfiles[memberId]?.image;
                        const initials = memberName
                          .split(/\s+/)
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <div
                            key={memberId}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-white"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-9 h-9 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ backgroundColor: avatarUrl ? "#ffffff" : themeColor }}
                              >
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={memberName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{initials}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {memberName}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">{memberSub}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <label className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                                <Upload className="w-3 h-3 text-slate-500" />
                                <span>{avatarUrl ? "Change" : "Upload"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleTeamMemberAvatarUpload(memberId, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {avatarUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCustomProfiles((prev) => {
                                      const next = { ...prev };
                                      if (next[memberId]) {
                                        const { image: _removed, ...rest } = next[memberId];
                                        next[memberId] = rest;
                                      }
                                      return next;
                                    })
                                  }
                                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-red-600 cursor-pointer"
                                  title="Remove custom photo"
                                >
                                  Clear
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleTeamMember(memberId)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove team member"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/40 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Show available online team members
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Display available member photos and names inside the chat widget
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlineMembers}
                      onChange={(e) => setShowOnlineMembers(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1456f0] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 6: AUTO WELCOME MESSAGE ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 6 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(6)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 6 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">6. Auto Welcome Message</span>
              <div className="flex items-center gap-2">
                {Boolean(welcomeMessage.trim()) && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 6 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 6 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Welcome message</span>
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Hello! Welcome to Mantra Health. How can we assist you today?"
                    className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Show delay</span>
                    <InfoTip text="Delay before the launcher welcome message pops up for visitors." />
                  </label>
                  <select
                    value={autoWelcomeDelay}
                    onChange={(e) =>
                      setAutoWelcomeDelay(
                        e.target.value as "immediate" | "3s" | "5s" | "10s" | "30s"
                      )
                    }
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="immediate">Show immediately</option>
                    <option value="3s">After 3 seconds</option>
                    <option value="5s">After 5 seconds</option>
                    <option value="10s">After 10 seconds</option>
                    <option value="30s">After 30 seconds</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 7: INSTALLATION & EMBED SCRIPT (AT THE BOTTOM) ── */}
          <div className={`border rounded-lg bg-white transition-colors ${openSection === 7 ? "border-slate-300 shadow-2xs" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => handleToggleSection(7)}
              className={`w-full flex items-center justify-between p-4 transition-colors text-left cursor-pointer ${
                openSection === 7 ? "rounded-t-lg bg-slate-50/70 border-b border-slate-200" : "rounded-lg bg-white hover:bg-slate-50/80"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">7. Installation &amp; Embed Script</span>
              <div className="flex items-center gap-2">
                {scriptKey && <Check className="w-4 h-4 text-emerald-600" />}
                {openSection === 7 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {openSection === 7 && (
              <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                {/* Embed Script Card */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/40 space-y-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Add to your website</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Paste this just before &lt;/body&gt; on every page. Saved changes apply without editing your site again.
                    </p>
                  </div>
                  <div className="bg-[#18202B] rounded-xl border border-slate-800 overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-slate-700/70 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Code className="w-3.5 h-3.5 text-slate-400" />
                        <span>Embed script · Place before &lt;/body&gt;</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-100 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedCode ? "Copied" : "Copy code"}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 text-[11px] font-mono text-slate-200 whitespace-pre-wrap break-all leading-relaxed">
                      {embedScript}
                    </pre>
                  </div>
                </div>

                {/* Allowed Website Card (Max 1 website) */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Allowed website</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Restrict where this chat can load, such as https://clinic.com.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{allowedWebsites.length} allowed</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {allowedWebsites.length}/1
                      </span>
                    </div>
                  </div>

                  {allowedWebsites.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={newSiteUrl}
                        onChange={(e) => setNewSiteUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSite();
                          }
                        }}
                        placeholder="https://clinic.com"
                        className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSite}
                        className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add site</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allowedWebsites.slice(0, 1).map((site) => (
                        <span
                          key={site}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-700"
                        >
                          <span className="truncate max-w-[300px]">{site}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAllowedWebsites((prev) => prev.filter((item) => item !== site))
                            }
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            aria-label={`Remove ${site}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sticky Column: Live Website Widget Preview ── */}
        <div className="lg:col-span-5 sticky top-2 self-start space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Preview
                </span>
                <span className="text-[10px] font-mono text-slate-500">{position}</span>
              </div>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-200/70 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewExpanded(true)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    previewExpanded ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Widget
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewExpanded(false)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    !previewExpanded ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Launcher
                </button>
              </div>
            </div>

            {/* Simulated Browser Viewport */}
            <div className="relative h-[520px] bg-slate-100/80 flex flex-col overflow-hidden">
              {/* Mock Browser Bar */}
              <div className="h-8 px-3 bg-white border-b border-slate-200/80 flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
                <div className="flex-1 h-5 rounded bg-slate-100 px-2 flex items-center text-[10px] font-mono text-slate-500 truncate">
                  {previewDomain}
                </div>
              </div>

              {/* Page Canvas with subtle wireframe + anchored widget preview */}
              <div className={`relative flex-1 p-3 flex flex-col ${cardAnchorClass} overflow-hidden`}>
                {/* Faint page skeleton backdrop */}
                <div className="absolute inset-4 pointer-events-none opacity-35 space-y-2.5">
                  <div className="h-5 w-40 rounded bg-slate-300/70" />
                  <div className="h-2.5 w-64 rounded bg-slate-200" />
                  <div className="h-2.5 w-52 rounded bg-slate-200" />
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="h-20 rounded-xl bg-slate-200/80" />
                    <div className="h-20 rounded-xl bg-slate-200/80" />
                  </div>
                </div>

                {/* Expanded Widget Card */}
                {previewExpanded && (
                  <div
                    className={`relative z-10 w-[290px] max-h-[420px] flex flex-col rounded-2xl border shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 ${
                      themeMode === "dark"
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    {/* Header */}
                    <div
                      className="px-3.5 py-3 flex items-center justify-between text-white shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0 border border-white/25 font-bold text-xs">
                          {botAvatar ? (
                            <img src={botAvatar} alt={name || "Chatbot"} className="w-full h-full object-cover" />
                          ) : (
                            <span>{botInitials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {name.trim() || "Website Chat"}
                          </div>
                          <div className="text-[10px] text-white/85 truncate">
                            {headline.trim() || "Online · Ready to help"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {showOnlineMembers && agentQueue.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {agentQueue.slice(0, 3).map((memberId) => {
                              const m = orgTeamMembers.find((tm) => String(tm.id) === memberId);
                              const mName = m?.name || customProfiles[memberId]?.name || "Team";
                              const mAvatar = customProfiles[memberId]?.image;
                              const mInitials = mName
                                .split(/\s+/)
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();
                              return (
                                <span
                                  key={memberId}
                                  title={mName}
                                  className="w-5 h-5 rounded-full border border-white/70 bg-white/20 overflow-hidden flex items-center justify-center text-[8px] font-bold text-white"
                                >
                                  {mAvatar ? (
                                    <img
                                      src={mAvatar}
                                      alt={mName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    mInitials
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewExpanded(false)}
                          className="p-1 rounded-lg hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
                          title="Minimize preview"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin-clean p-3 space-y-2.5">
                      {showOnlineMembers && (() => {
                        const previewMembers =
                          agentQueue.length > 0
                            ? agentQueue.slice(0, 4).map((memberId) => {
                                const m = orgTeamMembers.find((tm) => String(tm.id) === memberId);
                                const fullName =
                                  m?.name || customProfiles[memberId]?.name || `Member #${memberId}`;
                                return {
                                  id: memberId,
                                  firstName: fullName.split(/\s+/)[0] || fullName,
                                  fullName,
                                  avatar: customProfiles[memberId]?.image,
                                };
                              })
                            : orgTeamMembers.slice(0, 3).map((m) => {
                                const memberId = String(m.id);
                                return {
                                  id: memberId,
                                  firstName: m.name.split(/\s+/)[0] || m.name,
                                  fullName: m.name,
                                  avatar: customProfiles[memberId]?.image,
                                };
                              });

                        if (previewMembers.length === 0) return null;

                        return (
                          <div
                            className={`rounded-xl border px-3 py-3 text-center space-y-2.5 ${
                              themeMode === "dark"
                                ? "bg-slate-800/60 border-slate-700"
                                : "bg-slate-50/80 border-slate-200/80"
                            }`}
                          >
                            <div>
                              <div
                                className={`text-xs font-semibold ${
                                  themeMode === "dark" ? "text-slate-100" : "text-slate-700"
                                }`}
                              >
                                We are online
                              </div>
                              <div
                                className={`text-[10px] ${
                                  themeMode === "dark" ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                and ready to help!
                              </div>
                            </div>

                            <div className="flex items-start justify-center gap-3.5 flex-wrap">
                              {previewMembers.map((pm) => {
                                const pmInitials = pm.fullName
                                  .split(/\s+/)
                                  .map((p) => p[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase();
                                return (
                                  <div
                                    key={pm.id}
                                    className="flex flex-col items-center gap-1 min-w-[44px]"
                                  >
                                    <div className="relative">
                                      <div
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-[11px] font-bold text-white"
                                        style={{
                                          backgroundColor: pm.avatar ? "#ffffff" : themeColor,
                                        }}
                                      >
                                        {pm.avatar ? (
                                          <img
                                            src={pm.avatar}
                                            alt={pm.fullName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span>{pmInitials}</span>
                                        )}
                                      </div>
                                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                    </div>
                                    <span
                                      className={`text-[10px] font-medium truncate max-w-[54px] ${
                                        themeMode === "dark" ? "text-slate-200" : "text-slate-700"
                                      }`}
                                    >
                                      {pm.firstName}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-start gap-2">
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5"
                          style={{ backgroundColor: botAvatar ? "#ffffff" : themeColor }}
                        >
                          {botAvatar ? (
                            <img src={botAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{botInitials}</span>
                          )}
                        </div>
                        <div
                          className={`px-3 py-2 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed max-w-[85%] ${
                            themeMode === "dark"
                              ? "bg-slate-800 text-slate-100"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {welcomeMessage || "Hello! How can we help you today?"}
                        </div>
                      </div>

                      {enablePreChatForm && preChatTiming === "after_first_message" && (
                        <div className="flex justify-end">
                          <div
                            className="px-2.5 py-1.5 rounded-2xl rounded-br-xs text-[10px] text-white max-w-[80%]"
                            style={{ backgroundColor: themeColor }}
                          >
                            Hi, I&apos;d like to ask about an appointment.
                          </div>
                        </div>
                      )}

                      {enablePreChatForm && (
                        <div
                          className={`p-2.5 rounded-xl border space-y-1.5 ${
                            themeMode === "dark"
                              ? "bg-slate-800/70 border-slate-700"
                              : "bg-slate-50/80 border-slate-200/80"
                          }`}
                        >
                          {preChatTiming === "after_first_message" && (
                            <div
                              className={`text-[9px] font-medium ${
                                themeMode === "dark" ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              Shown after visitor&apos;s first message
                            </div>
                          )}
                          {formFields.name && (
                            <input
                              type="text"
                              value={previewVisitorName}
                              onChange={(e) => setPreviewVisitorName(e.target.value)}
                              placeholder="Full Name *"
                              className={`w-full h-7 px-2.5 rounded-lg border text-[10px] outline-none ${
                                themeMode === "dark"
                                  ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400"
                                  : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                              }`}
                            />
                          )}
                          {formFields.email && (
                            <input
                              type="email"
                              value={previewVisitorEmail}
                              onChange={(e) => setPreviewVisitorEmail(e.target.value)}
                              placeholder="Email Address"
                              className={`w-full h-7 px-2.5 rounded-lg border text-[10px] outline-none ${
                                themeMode === "dark"
                                  ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400"
                                  : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                              }`}
                            />
                          )}
                          {formFields.phone && (
                            <input
                              type="tel"
                              value={previewVisitorPhone}
                              onChange={(e) => setPreviewVisitorPhone(e.target.value)}
                              placeholder="Phone Number"
                              className={`w-full h-7 px-2.5 rounded-lg border text-[10px] outline-none ${
                                themeMode === "dark"
                                  ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400"
                                  : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                              }`}
                            />
                          )}
                          {formFields.requirement && (
                            <div
                              className={`h-7 px-2.5 rounded-lg border text-[10px] flex items-center justify-between ${
                                themeMode === "dark"
                                  ? "bg-slate-900 border-slate-700 text-slate-400"
                                  : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              <span>Book an Appointment</span>
                              <ChevronDown className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pinned Composer Footer */}
                    <div
                      className={`shrink-0 px-3 pt-2 pb-2.5 border-t space-y-1.5 ${
                        themeMode === "dark"
                          ? "bg-slate-900 border-slate-800"
                          : "bg-white border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={previewMessageInput}
                          onChange={(e) => setPreviewMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          className={`flex-1 h-8 px-2.5 rounded-xl border text-[11px] outline-none ${
                            themeMode === "dark"
                              ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400"
                              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                          }`}
                        />
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: themeColor }}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {!removeSignature && (
                        <div className="text-center text-[9px] text-slate-400">
                          Powered by MantraAssist
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Minimized Launcher Auto-Welcome Callout + Icon Launcher Button */}
                {!previewExpanded ? (
                  <div
                    className={`absolute ${launcherAnchorClass} z-20 flex items-center gap-2.5 ${
                      position.endsWith("left") ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      onClick={() => setPreviewExpanded(true)}
                      className={`relative w-[220px] rounded-xl border p-2.5 shadow-md cursor-pointer transition-all animate-in fade-in zoom-in-95 duration-150 ${
                        themeMode === "dark"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-900"
                      }`}
                      style={{ borderColor: themeColor }}
                    >
                      {/* Pointer caret toward launcher icon */}
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 ${
                          themeMode === "dark" ? "bg-slate-900" : "bg-white"
                        } ${
                          position.endsWith("left")
                            ? "-left-[6px] border-l border-b"
                            : "-right-[6px] border-r border-t"
                        }`}
                        style={{ borderColor: themeColor }}
                      />
                      <div className="relative flex items-start gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 border border-slate-200/70"
                          style={{ backgroundColor: botAvatar ? "#ffffff" : themeColor }}
                        >
                          {botAvatar ? (
                            <img
                              src={botAvatar}
                              alt={name || "Chatbot"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{botInitials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="text-[11px] font-bold truncate">
                            {name.trim() || "Website Chat"}
                          </div>
                          <p
                            className={`text-[10px] leading-snug mt-0.5 line-clamp-3 ${
                              themeMode === "dark" ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            {welcomeMessage.trim() ||
                              "Hello! Welcome to Mantra Health. How can we assist you today?"}
                          </p>
                        </div>
                        <X className="w-3 h-3 text-slate-400 shrink-0 absolute top-0 right-0" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewExpanded(true)}
                      title="Expand preview widget"
                      className="w-11 h-11 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shrink-0 ring-4 ring-slate-200/70"
                      style={{ backgroundColor: themeColor }}
                    >
                      {renderLauncherGlyph("w-5 h-5")}
                    </button>
                  </div>
                ) : (
                  /* Floating Launcher Button anchored to exact chosen corner/edge when widget is open */
                  <button
                    type="button"
                    onClick={() => setPreviewExpanded(false)}
                    title="Minimize preview widget"
                    className={`absolute ${launcherAnchorClass} z-20 w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer overflow-hidden border-2 border-white/80`}
                    style={{ backgroundColor: themeColor }}
                  >
                    {renderLauncherGlyph("w-4 h-4")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
