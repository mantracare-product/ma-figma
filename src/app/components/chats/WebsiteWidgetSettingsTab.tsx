import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Globe,
  Palette,
  MessageSquare,
  Sparkles,
  Check,
  Send,
  User,
  Mail,
  Phone,
  Layers,
  Bot,
  Code,
  Copy,
  Tag,
  ChevronDown,
  Clock,
  Sliders,
  Users,
  ShieldCheck,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Upload,
  PhoneCall,
  GitFork,
  MapPin,
  Building2,
} from "lucide-react";
import {
  getWebsiteWidgetConfig,
  saveWebsiteWidgetConfig,
  WebsiteWidgetConfig,
} from "../../../lib/websiteWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";
import { processWebsiteVisitorSubmission } from "../../../lib/websiteChatSimulator";
import { toast } from "sonner";
import { InfoTooltip } from "../help/InfoTooltip";

interface WebsiteWidgetSettingsTabProps {
  onNavigateToInbox?: () => void;
  registerSaveHandler?: (fn: () => void) => void;
}

const PRESET_COLORS = [
  "#1456f0", // MantraAssist Brand Blue
  "#0ea5e9", // Sky Blue
  "#10B981", // Clinical Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#1E293B", // Dark Slate Navy
];

const SYSTEM_AVATARS = [
  "https://ui-avatars.com/api/?name=W1&background=fecdd3&color=be123c",
  "https://ui-avatars.com/api/?name=W2&background=fed7aa&color=c2410c",
  "https://ui-avatars.com/api/?name=W3&background=fde047&color=a16207",
  "https://ui-avatars.com/api/?name=W4&background=d9f99d&color=4d7c0f",
  "https://ui-avatars.com/api/?name=M1&background=bfdbfe&color=1d4ed8",
  "https://ui-avatars.com/api/?name=M2&background=ddd6fe&color=6d28d9",
  "https://ui-avatars.com/api/?name=M3&background=fbcfe8&color=be185d",
  "https://ui-avatars.com/api/?name=M4&background=e2e8f0&color=334155",
];

interface MockAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string;
}

export default function WebsiteWidgetSettingsTab({ onNavigateToInbox, registerSaveHandler }: WebsiteWidgetSettingsTabProps) {
  const [config, setConfig] = useState<WebsiteWidgetConfig>(getWebsiteWidgetConfig);
  const processes = getStoredProcesses();
  const teamMembers = getStoredTeamMembers();
  const { activeOrganization } = useOrganization();

  // Load locations from the active organization
  const availableOrgLocations = useMemo(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization?.id || "demo"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: item.id || item.name,
            name: item.name,
            address: item.address || "123 Health Ave, Suite 400",
            schedule: "Monday – Friday: 9:00 AM – 5:00 PM",
            timezone: "America/Los_Angeles (PT)",
          }));
        }
      }
    } catch {}

    const locNames =
      activeOrganization?.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : ["California Branch", "New York Center", "Online / Virtual"];

    return locNames.map((name, i) => ({
      id: `loc-${i + 1}`,
      name,
      address: name.includes("New York")
        ? "450 Lexington Ave, Suite 210, New York, NY"
        : name.includes("California")
        ? "123 Health Ave, Suite 400, Los Angeles, CA"
        : "Online Telehealth Service",
      schedule: "Monday – Friday: 9:00 AM – 5:00 PM",
      timezone: name.includes("New York") ? "Eastern Time (EST)" : "Pacific Time (PST)",
    }));
  }, [activeOrganization]);

  // Accordion Section States
  const [showWidgetSection, setShowWidgetSection] = useState(true);
  const [showRoutingSection, setShowRoutingSection] = useState(true);


  // Agent Queue State
  const [agentSearch, setAgentSearch] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentSelectRef = useRef<HTMLDivElement>(null);

  // Custom Profile Avatar Popover
  const [popoverAgentId, setPopoverAgentId] = useState<string | null>(null);

  // Test Visitor Simulator State
  const [simName, setSimName] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simPhone, setSimPhone] = useState("");
  const [simRequirementId, setSimRequirementId] = useState("");
  const [simMessage, setSimMessage] = useState("");
  const [simHistory, setSimHistory] = useState<Array<{ sender: "user" | "bot"; text: string; header?: any; buttons?: any[] }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    if (!simRequirementId && config.requirements?.length > 0) {
      setSimRequirementId(config.requirements[0].id);
    }
  }, [config.requirements, simRequirementId]);

  // Build combined agent list from team store + seeds
  const availableAgents: MockAgent[] = [
    {
      id: "u1",
      name: "Dr. Sarah Mitchell",
      email: "sarah.m@mantra.care",
      role: "Lead Care Coordinator",
      image: "https://ui-avatars.com/api/?name=Sarah+Mitchell&background=1456f0&color=fff",
    },
    {
      id: "u2",
      name: "Marcus Vance",
      email: "marcus.v@mantra.care",
      role: "Patient Intake Specialist",
      image: "https://ui-avatars.com/api/?name=Marcus+Vance&background=64748b&color=fff",
    },
    {
      id: "u3",
      name: "Elena Rostova",
      email: "elena.r@mantra.care",
      role: "Triage Nurse",
      image: "https://ui-avatars.com/api/?name=Elena+Rostova&background=047857&color=fff",
    },
    {
      id: "u4",
      name: "Technical Support",
      email: "support@mantra.care",
      role: "Support Team",
      image: "https://ui-avatars.com/api/?name=Technical+Support&background=0284c7&color=fff",
    },
    ...teamMembers.map((tm) => ({
      id: String(tm.id),
      name: tm.name,
      email: tm.email,
      role: tm.role || "Team Member",
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.name)}&background=1E293B&color=fff`,
    })),
  ].filter((a, index, self) => index === self.findIndex((t) => t.id === a.id));

  // Auto-save changes to localStorage
  useEffect(() => {
    saveWebsiteWidgetConfig(config);
  }, [config]);

  // Click outside listener for agent dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentSelectRef.current && !agentSelectRef.current.contains(event.target as Node)) {
        setAgentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    saveWebsiteWidgetConfig(config);
    toast.success("Website widget settings saved successfully!");
  };

  useEffect(() => {
    if (registerSaveHandler) {
      registerSaveHandler(handleSave);
    }
  }, [registerSaveHandler, config]);

  const handleAddRequirement = () => {
    const newReqId = `req-${Date.now()}`;
    const newReq = {
      id: newReqId,
      label: "New Requirement",
      processId: processes[0]?.id || "1",
    };
    setConfig((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), newReq],
    }));
  };

  const handleUpdateRequirement = (index: number, field: "label" | "processId", value: string) => {
    setConfig((prev) => {
      const updated = [...(prev.requirements || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, requirements: updated };
    });
  };

  const handleRemoveRequirement = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      requirements: (prev.requirements || []).filter((_, i) => i !== index),
    }));
  };



  const toggleQueueAgent = (id: string) => {
    setConfig((prev) => {
      const current = prev.agentQueue || [];
      const updated = current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id];
      return { ...prev, agentQueue: updated };
    });
    setAgentSearch("");
  };

  const updateCustomProfile = (agentId: string, field: "name" | "position" | "image", value: string) => {
    setConfig((prev) => ({
      ...prev,
      customProfiles: {
        ...(prev.customProfiles || {}),
        [agentId]: {
          ...(prev.customProfiles?.[agentId] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleCustomAvatarUpload = (agentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateCustomProfile(agentId, "image", url);
      setPopoverAgentId(null);
    }
  };

  // Embed script snippet
  const embedScriptSnippet = `<script 
  src="https://app.mantraassist.com/widget.js" 
  data-bot-name="${config.botName.replace(/"/g, '&quot;')}"
  data-theme-color="${config.themeColor}"
  data-theme-mode="${config.themeMode}"
  data-position="${config.position || 'bottom-right'}"
  data-first-responder="${config.firstResponder || 'ai'}"
  async
></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedScriptSnippet);
    setCopiedSnippet(true);
    toast.success("Widget embed code copied to clipboard!");
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  const handleRunSimulator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) {
      toast.error("Please enter a visitor name for the test submission.");
      return;
    }
    if (!simMessage.trim()) {
      toast.error("Please enter a test message.");
      return;
    }

    const chosenReq = (config.requirements || []).find((r) => r.id === simRequirementId) || config.requirements?.[0];
    const targetProcessId = (config.formFields.requirement ?? true) && chosenReq
      ? chosenReq.processId
      : config.autoCreateProcessId || processes[0]?.id || "1";
    const targetReqLabel = (config.formFields.requirement ?? true) && chosenReq ? chosenReq.label : undefined;

    setIsSubmitting(true);
    const result = processWebsiteVisitorSubmission({
      name: simName,
      email: simEmail,
      phone: simPhone,
      processId: targetProcessId,
      firstMessage: simMessage,
      requirementLabel: targetReqLabel,
    });

    setIsSubmitting(false);

    if (result) {
      setSimHistory([
        { sender: "user", text: simMessage },
        {
          sender: "bot",
          text: result.botReply,
          header: result.header,
          buttons: result.buttons,
        },
      ]);
      const reqInfo = targetReqLabel ? ` (${targetReqLabel})` : "";
      toast.success(
        `Website visitor created! Client: "${simName}" enrolled in "${result.processName}"${reqInfo} at stage "${result.stageName}".`,
        {
          action: onNavigateToInbox ? {
            label: "Open Inbox",
            onClick: onNavigateToInbox,
          } : undefined,
        }
      );
    }
  };

  // Process & Stage selection for Auto Create Client
  const selectedProcess = processes.find((p) => p.id === (config.autoCreateProcessId || processes[0]?.id));
  const processStages = selectedProcess ? selectedProcess.stages.map((s) => s.name) : ["New Lead", "Contacted", "Qualified"];

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Live Widget Simulator & Position Mockup (Sticky Non-scrolling) ── */}
        <div className="lg:col-span-5 space-y-5 sticky top-4 self-start max-h-[calc(100vh-32px)] overflow-y-auto pr-0.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Sparkles className="w-4 h-4 text-[#1456f0]" /> Live Widget Simulator
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-blue-50 text-[#1456f0] font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                Interactive Preview
              </span>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-[#1456f0] hover:bg-[#1044be] text-white rounded-xl font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <Check className="w-3.5 h-3.5" />
                Save Configuration
              </button>
            </div>
          </div>

          {/* Widget Card Container */}
          <div
            className={`rounded-2xl border border-[#E2E8F0] shadow-lg overflow-hidden transition-all ${
              config.themeMode === "dark" ? "bg-slate-900 text-white" : "bg-white text-gray-900"
            }`}
          >
            {/* Widget Top Bar */}
            <div
              className="p-4 flex items-center justify-between text-white shadow-xs"
              style={{ backgroundColor: config.themeColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {config.botName || "MantraAssist Care Bot"}
                  </h4>
                  {!config.removeSignature ? (
                    <span className="text-[10px] text-white/80">Online · Powered by MantraAssist</span>
                  ) : (
                    <span className="text-[10px] text-white/80">Online · Ready to help</span>
                  )}
                </div>
              </div>
              <Globe className="w-4 h-4 text-white/70" />
            </div>

            {/* Widget Body / Simulator Form */}
            <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
              {/* Welcome Message Bubble */}
              <div className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: config.themeColor }}
                >
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div
                  className={`p-3 rounded-2xl rounded-tl-xs text-xs max-w-[85%] ${
                    config.themeMode === "dark" ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-[#1E293B]"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {config.welcomeMessage}
                </div>
              </div>

              {/* Form Input Area */}
              <form onSubmit={handleRunSimulator} className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 dark:bg-slate-800/50 space-y-2.5">
                  <p className="text-[11px] font-bold text-[#475569] dark:text-slate-300" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {config.enablePreChatForm ? "Complete form to start chat:" : "Test conversation:"}
                  </p>

                  {config.enablePreChatForm && config.formFields.name && (
                    <div>
                      <input
                        type="text"
                        value={simName}
                        onChange={(e) => setSimName(e.target.value)}
                        placeholder="Visitor Name *"
                        className="w-full text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                        required
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && config.formFields.email && (
                    <div>
                      <input
                        type="email"
                        value={simEmail}
                        onChange={(e) => setSimEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && config.formFields.phone && (
                    <div>
                      <input
                        type="tel"
                        value={simPhone}
                        onChange={(e) => setSimPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      />
                    </div>
                  )}

                  {config.enablePreChatForm && (config.formFields.requirement ?? true) && (
                    <div>
                      <select
                        value={simRequirementId || config.requirements?.[0]?.id || ""}
                        onChange={(e) => setSimRequirementId(e.target.value)}
                        className="w-full text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white outline-none focus:border-[#1456f0] cursor-pointer"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {(config.requirements || []).map((req) => (
                          <option key={req.id} value={req.id}>
                            {req.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: config.themeColor, fontFamily: "DM Sans, sans-serif" }}
                >
                  <Send className="w-3.5 h-3.5" /> Submit &amp; Start Chat
                </button>
              </form>

              {/* Chat Simulation Output */}
              {simHistory.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2.5">
                  <p className="text-[11px] font-bold text-gray-500" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Automated Bot Response:
                  </p>
                  {simHistory.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[90%] space-y-1 ${
                          m.sender === "user"
                            ? "text-white rounded-br-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-[#1E293B] dark:text-slate-100 rounded-bl-xs"
                        }`}
                        style={{
                          backgroundColor: m.sender === "user" ? config.themeColor : undefined,
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {m.header?.text && (
                          <div className="font-bold text-[11px] pb-1 border-b border-gray-200/40">
                            {m.header.text}
                          </div>
                        )}
                        <p>{m.text}</p>

                        {m.buttons && m.buttons.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {m.buttons.map((b, bi) => (
                              <span
                                key={bi}
                                className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-medium"
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Choose Position Grid Mockup (ai-chat-module parity) ── */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Sliders className="w-4 h-4 text-[#1456f0]" />
                <span>Choose Widget Position</span>
              </h3>
              <span className="text-[11px] font-mono text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-md">
                {config.position || "bottom-right"}
              </span>
            </div>

            <p className="text-xs text-[#64748b]">Select where the floating launcher button anchors on website visitor screens:</p>

            {/* Position Mockup Window */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              {/* Browser window header */}
              <div className="bg-[#f1f5f9] border-b border-[#E2E8F0] h-6 flex items-center gap-1.5 px-3">
                <span className="w-2 h-2 rounded-full bg-[#cbd5e1]"></span>
                <span className="w-2 h-2 rounded-full bg-[#cbd5e1]"></span>
                <span className="w-2 h-2 rounded-full bg-[#cbd5e1]"></span>
              </div>

              {/* 3x2 Grid */}
              <div className="grid grid-cols-3 grid-rows-2 gap-[1px] bg-[#E2E8F0]">
                {[
                  { id: "top-left", label: "Top Left", arrow: "↖" },
                  { id: "top-center", label: "Top Center", arrow: "↑" },
                  { id: "top-right", label: "Top Right", arrow: "↗" },
                  { id: "bottom-left", label: "Bottom Left", arrow: "↙" },
                  { id: "bottom-center", label: "Bottom Center", arrow: "↓" },
                  { id: "bottom-right", label: "Bottom Right", arrow: "↘" },
                ].map((pos) => {
                  const isActive = (config.position || "bottom-right") === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => setConfig((prev) => ({ ...prev, position: pos.id as any }))}
                      className={`h-20 bg-white flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                        isActive
                          ? "bg-blue-50/80 text-[#1456f0] ring-2 ring-inset ring-[#1456f0]"
                          : "hover:bg-slate-50 text-slate-300 hover:text-slate-500"
                      }`}
                    >
                      <span className="text-xl font-bold select-none">{pos.arrow}</span>
                      <span className="text-[10px] font-semibold mt-0.5 select-none">{pos.label}</span>

                      {/* Active floating widget button badge */}
                      {isActive && (
                        <div
                          className="absolute w-7 h-7 rounded-full text-white flex items-center justify-center text-xs shadow-md transition-transform scale-105"
                          style={{
                            backgroundColor: config.themeColor,
                            top: pos.id.includes("top") ? "6px" : undefined,
                            bottom: pos.id.includes("bottom") ? "6px" : undefined,
                            left: pos.id.includes("left") ? "6px" : pos.id.includes("center") ? "calc(50% - 14px)" : undefined,
                            right: pos.id.includes("right") ? "6px" : undefined,
                          }}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Configuration Settings (Separated Cards) ── */}
        <div className="lg:col-span-7 space-y-5">

          {/* ── Collapsible Section 1: Website Widget Section ── */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setShowWidgetSection(!showWidgetSection)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-[#E2E8F0] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="text-left flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Website Widget Section
                  </h3>
                  <span onClick={(e) => e.stopPropagation()}>
                    <InfoTooltip text="Appearance, branding, location working hours, and pre-chat intake" />
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showWidgetSection ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {showWidgetSection && (
              <div className="p-4 space-y-5">
                {/* 1. Theme & Colors */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B] border-b border-gray-100 pb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Palette className="w-4 h-4 text-[#1456f0]" />
                    <span>Theme & Colors</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Widget Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, themeColor: c }))}
                          className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-105 cursor-pointer shadow-2xs"
                          style={{
                            backgroundColor: c,
                            borderColor: config.themeColor === c ? "#0F172A" : "transparent",
                          }}
                        >
                          {config.themeColor === c && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-xl px-2 py-1 bg-white">
                        <input
                          type="color"
                          value={config.themeColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, themeColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                          title="Custom Color"
                        />
                        <span className="text-xs font-mono text-[#64748b] uppercase">{config.themeColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Theme Mode
                    </label>
                    <select
                      value={config.themeMode}
                      onChange={(e) => setConfig((prev) => ({ ...prev, themeMode: e.target.value as any }))}
                      className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium focus:border-[#1456f0] focus:ring-2 focus:ring-[#1456f0]/10 outline-none"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                    </select>
                  </div>
                </div>

                {/* 2. Branding & Header */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B] border-b border-gray-100 pb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Bot className="w-4 h-4 text-[#1456f0]" />
                    <span>Branding & Header</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Bot / Brand Name
                    </label>
                    <input
                      type="text"
                      value={config.botName}
                      onChange={(e) => setConfig((prev) => ({ ...prev, botName: e.target.value }))}
                      placeholder="e.g. MantraAssist Care Bot"
                      className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 text-[#1E293B] font-medium bg-white focus:border-[#1456f0] focus:ring-2 focus:ring-[#1456f0]/10 outline-none"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Remove &ldquo;Powered by MantraAssist&rdquo; signature
                      </span>
                      <InfoTooltip text="White-label the chatbot widget header and footer" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.removeSignature}
                        onChange={(e) => setConfig((prev) => ({ ...prev, removeSignature: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Working Time Preferences (Location Schedule Based) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1456f0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Working Time Preferences
                      </h3>
                      <InfoTooltip text="Show the widget only during specific business work hours based on location schedule" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.workHoursEnabled}
                        onChange={(e) => setConfig((prev) => ({ ...prev, workHoursEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]"></div>
                    </label>
                  </div>

                  {config.workHoursEnabled && (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Choose Organization Location
                        </label>
                        <div className="relative">
                          <select
                            value={config.selectedLocation || availableOrgLocations[0]?.name}
                            onChange={(e) => {
                              const found = availableOrgLocations.find((l) => l.name === e.target.value);
                              setConfig((prev) => ({
                                ...prev,
                                selectedLocation: e.target.value,
                                selectedLocationId: found?.id,
                              }));
                            }}
                            className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 pl-8 bg-white text-[#1E293B] font-medium focus:border-[#1456f0] focus:ring-2 focus:ring-[#1456f0]/10 outline-none cursor-pointer"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {availableOrgLocations.map((loc) => (
                              <option key={loc.id} value={loc.name}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                          <MapPin className="w-4 h-4 text-[#1456f0] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Location Operating Hours Summary Card */}
                      {(() => {
                        const activeLoc =
                          availableOrgLocations.find(
                            (l) => l.name === (config.selectedLocation || availableOrgLocations[0]?.name)
                          ) || availableOrgLocations[0];
                        if (!activeLoc) return null;
                        return (
                          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                                <Building2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                <span>{activeLoc.name}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                  Synced with Location
                                </span>
                                <InfoTooltip text="Working hours and days are automatically inherited from this location's schedule configured in Organization Settings." />
                              </div>
                            </div>
                            <div className="text-[11px] text-[#475569] space-y-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              <div><strong className="text-[#1E293B]">Address:</strong> {activeLoc.address}</div>
                              <div><strong className="text-[#1E293B]">Work Hours:</strong> {activeLoc.schedule}</div>
                              <div><strong className="text-[#1E293B]">Timezone:</strong> {activeLoc.timezone}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>



                {/* 5. Pre-Chat Form */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <Layers className="w-4 h-4 text-[#1456f0]" />
                      <span>Pre-Chat Form</span>
                      <InfoTooltip text="Intake fields collected from web visitors before initiating the conversation" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enablePreChatForm}
                        onChange={(e) => setConfig((prev) => ({ ...prev, enablePreChatForm: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]"></div>
                    </label>
                  </div>

                  {config.enablePreChatForm && (
                    <div className="space-y-4 pt-1">
                      {/* Form Fields: Full Name, Email, Phone, Requirement */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <label className="flex items-center gap-2 text-xs text-[#1E293B] p-2.5 border border-[#E2E8F0] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.formFields.name}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                formFields: { ...prev.formFields, name: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                          />
                          <User className="w-3.5 h-3.5 text-[#64748b]" /> Full Name
                        </label>

                        <label className="flex items-center gap-2 text-xs text-[#1E293B] p-2.5 border border-[#E2E8F0] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.formFields.email}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                formFields: { ...prev.formFields, email: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                          />
                          <Mail className="w-3.5 h-3.5 text-[#64748b]" /> Email Address
                        </label>

                        <label className="flex items-center gap-2 text-xs text-[#1E293B] p-2.5 border border-[#E2E8F0] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.formFields.phone}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                formFields: { ...prev.formFields, phone: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                          />
                          <Phone className="w-3.5 h-3.5 text-[#64748b]" /> Phone Number
                        </label>

                        <label className="flex items-center gap-2 text-xs text-[#1E293B] p-2.5 border border-[#E2E8F0] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.formFields.requirement ?? true}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                formFields: { ...prev.formFields, requirement: e.target.checked, processSelect: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                          />
                          <HelpCircle className="w-3.5 h-3.5 text-[#64748b]" /> Requirement
                        </label>
                      </div>

                      {/* Auto Create the Client & Requirement to Process Mapping */}
                      <div className="p-3.5 border border-[#E2E8F0] rounded-xl bg-gray-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              Auto Create the Client
                            </span>
                            <InfoTooltip text="Automatically enroll new visitors as CRM clients in workflow" />
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.autoCreateClientEnabled}
                              onChange={(e) => setConfig((prev) => ({ ...prev, autoCreateClientEnabled: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1456f0]"></div>
                          </label>
                        </div>

                        {config.autoCreateClientEnabled && (
                          (config.formFields.requirement ?? true) ? (
                            <div className="space-y-2.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                  Requirement to Process Mapping
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAddRequirement}
                                  className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Add Requirement
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(config.requirements || []).map((req, idx) => (
                                  <div key={req.id || idx} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={req.label}
                                      onChange={(e) => handleUpdateRequirement(idx, "label", e.target.value)}
                                      placeholder="Requirement Option (e.g. Booking)"
                                      className="flex-1 text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                    />
                                    <span className="text-xs text-[#94a3b8] font-mono">→</span>
                                    <select
                                      value={req.processId}
                                      onChange={(e) => handleUpdateRequirement(idx, "processId", e.target.value)}
                                      className="flex-1 text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                    >
                                      {processes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                    {(config.requirements || []).length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRequirement(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                                        title="Remove requirement"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                  Process
                                </label>
                                <select
                                  value={config.autoCreateProcessId}
                                  onChange={(e) => setConfig((prev) => ({ ...prev, autoCreateProcessId: e.target.value }))}
                                  className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                >
                                  {processes.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                  Initial Stage
                                </label>
                                <select
                                  value={config.autoCreateStage}
                                  onChange={(e) => setConfig((prev) => ({ ...prev, autoCreateStage: e.target.value }))}
                                  className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                >
                                  {processStages.map((stage) => (
                                    <option key={stage} value={stage}>{stage}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Collapsible Section 2: Chat Routing Settings (ai-chat-module parity) ── */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setShowRoutingSection(!showRoutingSection)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-[#E2E8F0] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center font-bold">
                  <GitFork className="w-4 h-4" />
                </div>
                <div className="text-left flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Chat Routing Settings
                  </h3>
                  <span onClick={(e) => e.stopPropagation()}>
                    <InfoTooltip text="First responder, employee queue assignment, automated client creation & agent profile display" />
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showRoutingSection ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {showRoutingSection && (
              <div className="p-4 space-y-5">
                {/* 1. First Responder */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <ShieldCheck className="w-4 h-4 text-[#1456f0]" />
                      <span>First Responder</span>
                    </div>
                    <InfoTooltip text="Select who responds first when a visitor initiates a chat" />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#1E293B] cursor-pointer" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <input
                        type="radio"
                        name="firstResponder"
                        value="ai"
                        checked={config.firstResponder === "ai"}
                        onChange={() => setConfig((prev) => ({ ...prev, firstResponder: "ai" }))}
                        className="accent-[#1456f0]"
                      />
                      <span>AI Assistant</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-[#1E293B] cursor-pointer" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      <input
                        type="radio"
                        name="firstResponder"
                        value="human"
                        checked={config.firstResponder === "human"}
                        onChange={() => setConfig((prev) => ({ ...prev, firstResponder: "human" }))}
                        className="accent-[#1456f0]"
                      />
                      <span>Human Agent</span>
                    </label>
                  </div>


                </div>

                {/* 2. Queue & Routing */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B] border-b border-gray-100 pb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Users className="w-4 h-4 text-[#1456f0]" />
                    <span>Queue & Routing</span>
                  </div>

                  {/* Agent Queue Multi-select */}
                  <div className="space-y-1.5" ref={agentSelectRef}>
                    <div className="flex items-center gap-1.5">
                      <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Agent Queue ({config.agentQueue?.length || 0} assigned)
                      </label>
                      <InfoTooltip text="Search and assign team members to the visitor chat queue" />
                    </div>

                    <div
                      onClick={() => setAgentDropdownOpen(true)}
                      className="min-h-[44px] p-2 border border-[#E2E8F0] rounded-xl bg-white flex flex-wrap items-center gap-1.5 cursor-text focus-within:border-[#1456f0] focus-within:ring-2 focus-within:ring-[#1456f0]/10 transition-all"
                    >
                      {(config.agentQueue || []).map((id) => {
                        const agent = availableAgents.find((a) => a.id === id);
                        if (!agent) return null;
                        const custom = config.customProfiles?.[id];
                        const name = custom?.name || agent.name;
                        const avatar = custom?.image || agent.image;

                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-[#1E293B]"
                          >
                            <img src={avatar} alt={name} className="w-4 h-4 rounded-full object-cover" />
                            <span>{name}</span>
                            <X
                              className="w-3 h-3 text-slate-400 hover:text-red-500 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleQueueAgent(id);
                              }}
                            />
                          </span>
                        );
                      })}

                      <input
                        type="text"
                        value={agentSearch}
                        onChange={(e) => {
                          setAgentSearch(e.target.value);
                          setAgentDropdownOpen(true);
                        }}
                        onFocus={() => setAgentDropdownOpen(true)}
                        placeholder={(config.agentQueue || []).length === 0 ? "Search team members to assign..." : "Add more..."}
                        className="flex-1 text-xs outline-none bg-transparent min-w-[120px] text-[#1E293B]"
                      />
                    </div>

                    {/* Agent Dropdown list */}
                    {agentDropdownOpen && (
                      <div className="border border-[#E2E8F0] rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto mt-1 p-1 z-30">
                        {availableAgents
                          .filter(
                            (a) =>
                              !(config.agentQueue || []).includes(a.id) &&
                              a.name.toLowerCase().includes(agentSearch.toLowerCase())
                          )
                          .map((a) => (
                            <div
                              key={a.id}
                              onClick={() => toggleQueueAgent(a.id)}
                              className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <img src={a.image} alt={a.name} className="w-6 h-6 rounded-full object-cover" />
                                <div>
                                  <div className="text-xs font-bold text-[#1E293B]">{a.name}</div>
                                  <div className="text-[10px] text-[#64748b]">{a.role}</div>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[#1456f0]">+ Add</span>
                            </div>
                          ))}
                        {availableAgents.filter(
                          (a) =>
                            !(config.agentQueue || []).includes(a.id) &&
                            a.name.toLowerCase().includes(agentSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="p-3 text-center text-xs text-[#94a3b8]">No more agents found</div>
                        )}
                      </div>
                    )}
                  </div>



                  {/* Distribute submissions among employees */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Distribute Submissions Among Employees
                      </label>
                      <InfoTooltip text="Routing strategy: To everybody (simultaneous), evenly (round-robin), or as enqueued (sequential)" />
                    </div>
                    <select
                      value={config.distribution}
                      onChange={(e) => setConfig((prev) => ({ ...prev, distribution: e.target.value as any }))}
                      className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="To everybody">To everybody (Simultaneous broadcast)</option>
                      <option value="Evenly">Evenly (Round-robin balancing)</option>
                      <option value="Exactly as enqueued">Exactly as enqueued (Sequential priority)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Agent Display & Custom Profiles */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B] border-b border-gray-100 pb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <User className="w-4 h-4 text-[#1456f0]" />
                    <span>Agent Display Settings</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Agent Information Display Mode
                      </label>
                      <InfoTooltip text="Choose how agent identities appear to website visitors: actual account, custom alias/avatar, or anonymous" />
                    </div>
                    <select
                      value={config.agentDisplay}
                      onChange={(e) => setConfig((prev) => ({ ...prev, agentDisplay: e.target.value as any }))}
                      className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="user">User Profile (Show actual account info)</option>
                      <option value="custom">Use Custom Profile (Mask real identity)</option>
                      <option value="hide">Hide User Information (Anonymous agent)</option>
                    </select>
                  </div>

                  {config.agentDisplay === "custom" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Custom Profiles
                        </span>
                        <InfoTooltip text="Configure custom aliases and avatars for queue agents" />
                      </div>

                      {(config.agentQueue || []).length === 0 ? (
                        <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-xs text-slate-400">
                          No agents in queue. Add agents in the Queue section above.
                        </div>
                      ) : (
                        (config.agentQueue || []).map((id) => {
                          const base = availableAgents.find((a) => a.id === id);
                          if (!base) return null;
                          const custom = config.customProfiles?.[id] || {};
                          const displayName = custom.name !== undefined ? custom.name : base.name;
                          const displayPosition = custom.position !== undefined ? custom.position : base.role;
                          const displayImage = custom.image || base.image;

                          return (
                            <div key={id} className="p-3.5 border border-[#E2E8F0] rounded-xl bg-blue-50/20 space-y-3 relative">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#64748b] text-[11px] flex items-center gap-1.5">
                                  <img src={base.image} alt={base.name} className="w-4 h-4 rounded-full opacity-60" />
                                  Syncing from: <strong className="text-[#1E293B]">{base.name}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleQueueAgent(id)}
                                  className="text-[#94a3b8] hover:text-red-500 cursor-pointer text-xs"
                                  title="Remove from queue"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Avatar with popover */}
                                <div className="relative">
                                  <img
                                    src={displayImage}
                                    alt={displayName}
                                    onClick={() => setPopoverAgentId(popoverAgentId === id ? null : id)}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-[#1456f0]/30 cursor-pointer hover:border-[#1456f0] transition-colors"
                                    title="Click to choose avatar"
                                  />

                                  {popoverAgentId === id && (
                                    <div className="absolute top-14 left-0 bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xl z-50 w-56 space-y-2.5">
                                      <div className="text-[11px] font-bold text-[#475569] uppercase">Select System Avatar</div>
                                      <div className="grid grid-cols-4 gap-2">
                                        {SYSTEM_AVATARS.map((url, i) => (
                                          <img
                                            key={i}
                                            src={url}
                                            onClick={() => {
                                              updateCustomProfile(id, "image", url);
                                              setPopoverAgentId(null);
                                            }}
                                            className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
                                          />
                                        ))}
                                      </div>
                                      <div className="border-t border-gray-100 pt-2">
                                        <label className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-1 cursor-pointer justify-center">
                                          <Upload className="w-3 h-3" /> Upload Custom Photo
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleCustomAvatarUpload(id, e)}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => updateCustomProfile(id, "name", e.target.value)}
                                    placeholder="Public Display Name"
                                    className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                  />
                                  <input
                                    type="text"
                                    value={displayPosition}
                                    onChange={(e) => updateCustomProfile(id, "position", e.target.value)}
                                    placeholder="Position / Title"
                                    className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Card: Embed Widget Code (Positioned at Bottom) ── */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Code className="w-4 h-4 text-[#1456f0]" />
                <span>&lt;&gt; Widget Code</span>
                <InfoTooltip text="Paste this HTML snippet right before the closing </body> tag of your website to activate the chatbot widget" />
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1456f0] border border-[#bfdbfe] rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet ? "Copied to Clipboard" : "Copy to Clipboard"}
              </button>
            </div>

            <div className="relative bg-[#0F172A] rounded-xl p-3.5 overflow-x-auto text-xs font-mono text-slate-200 border border-slate-800">
              <pre>{embedScriptSnippet}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
