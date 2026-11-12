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
  ArrowRight,
  GripVertical,
  UserCheck,
} from "lucide-react";
import {
  getWebsiteWidgetConfig,
  saveWebsiteWidgetConfig,
  WebsiteWidgetConfig,
} from "../../../lib/websiteWidgetStore";
import {
  getStoredProcesses,
  isProcessMatchingOrg,
  DEFAULT_ENTITY_PROCESSES,
  EntityType,
  Process,
} from "../../../lib/useProcessStore";
import { useContactCategories } from "../../../lib/contactCategoriesStore";
import { getStoredTeamMembers, TeamMember } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";
import { processWebsiteVisitorSubmission } from "../../../lib/websiteChatSimulator";
import { toast } from "sonner";
import { InfoTooltip } from "../help/InfoTooltip";

interface WebsiteWidgetSettingsTabProps {
  onNavigateToInbox?: () => void;
  registerSaveHandler?: (fn: () => boolean | void) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
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

function formatLocationSchedule(workingHours?: any): string {
  if (!workingHours) return "Monday – Friday: 9:00 AM – 5:00 PM";
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const enabledDays = days.filter((d) => workingHours[d]?.enabled);
  if (enabledDays.length === 0) return "Closed";
  const first = workingHours[enabledDays[0]];
  const start = first?.start || "09:00";
  const end = first?.end || "17:00";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1, 3);
  if (enabledDays.length === 5 && enabledDays[0] === "monday" && enabledDays[4] === "friday") {
    return `Mon – Fri: ${start} – ${end}`;
  }
  return `${enabledDays.map(cap).join(", ")}: ${start} – ${end}`;
}

export default function WebsiteWidgetSettingsTab({
  onNavigateToInbox,
  registerSaveHandler,
  searchQuery = "",
  onClearSearch,
}: WebsiteWidgetSettingsTabProps) {
  const [config, setConfig] = useState<WebsiteWidgetConfig>(getWebsiteWidgetConfig);
  const processes = getStoredProcesses();
  const allTeamMembers = getStoredTeamMembers();
  const { activeOrganization } = useOrganization();

  // Load configured locations from the active organization data (no hardcoded branches)
  const availableOrgLocations = useMemo(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization?.id || "demo"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: item.id || item.name,
            name: item.name,
            address: item.address || `${item.name} Location`,
            schedule: formatLocationSchedule(item.workingHours),
            timezone: activeOrganization?.country === "India" ? "IST (UTC+05:30)" : "EST / PST (US)",
            workingHours: item.workingHours,
          }));
        }
      }
    } catch {}

    const locNames =
      activeOrganization?.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization?.location || "Headquarters"];

    return locNames.map((name, i) => ({
      id: `loc-${i + 1}`,
      name,
      address: `${name} Office`,
      schedule: "Monday – Friday: 9:00 AM – 5:00 PM",
      timezone: activeOrganization?.country === "India" ? "IST (UTC+05:30)" : "America/New_York (EST)",
      workingHours: null,
    }));
  }, [activeOrganization]);

  // Team members strictly belonging to this organization (no hardcoded or sample users)
  const orgTeamMembers = useMemo(() => {
    return allTeamMembers.filter((m) => {
      if (m.organizationId && activeOrganization?.id) {
        if (m.organizationId === activeOrganization.id) return true;
        if (
          m.organizationId === "1" &&
          (activeOrganization.id === "1" || activeOrganization.id === "demo" || activeOrganization.id === "eye-mantra")
        ) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [allTeamMembers, activeOrganization]);

  // Check if a member is available for the selected branch/location
  const isMemberAvailableForBranch = (member: TeamMember, branchName?: string) => {
    if (!branchName) return true;
    const memberLocations = [
      ...(member.locations || []),
      ...(member.availableLocations || []),
    ].map((l) => l.toLowerCase().trim());

    if (memberLocations.length === 0) return true; // not restricted
    const target = branchName.toLowerCase().trim();
    return memberLocations.some(
      (loc) => target.includes(loc) || loc.includes(target) || loc === "online" || loc === "all"
    );
  };

  // Process Entities aligned with Process & Workflows module (Processes, Appointment, Invoice, Insurance & Claims, Task)
  const processEntityOptions = useMemo<Array<{ id: EntityType; label: string }>>(
    () => [
      { id: "client", label: "Processes" },
      { id: "appointment", label: "Appointment" },
      { id: "invoice", label: "Invoice" },
      { id: "insurance", label: "Insurance & Claims" },
      { id: "task", label: "Task" },
    ],
    []
  );

  // Contact Categories for Auto Create Contact (Lead, Client, Supplier, Vendor, plus custom categories)
  const contactCategories = useContactCategories();

  // Helper to list workflows (Process names, no stages) belonging to a selected Process Entity
  const getWorkflowsForEntity = (entityType: string): Process[] => {
    const normalized = entityType || "client";
    const forEntity = processes.filter((p) => (p.entityType || "client") === normalized);
    const orgMatched = forEntity.filter((p) => isProcessMatchingOrg(p, activeOrganization));
    if (orgMatched.length > 0) return orgMatched;
    if (forEntity.length > 0) return forEntity;
    if (
      normalized !== "client" &&
      DEFAULT_ENTITY_PROCESSES[normalized as Exclude<EntityType, "client">]
    ) {
      return [DEFAULT_ENTITY_PROCESSES[normalized as Exclude<EntityType, "client">]];
    }
    return [];
  };

  // Search filtering logic
  const q = (searchQuery || "").toLowerCase().trim();

  const matchesPosition =
    !q ||
    ["position", "mockup", "launcher", "corner", "bottom-right", "bottom-left", "top-right", "top-left", "top-center", "bottom-center", "floating", "anchor"].some(
      (k) => k.includes(q) || q.includes(k)
    );
  const matchesTheme =
    !q || ["theme", "color", "colors", "palette", "mode", "dark", "light", "blue", "primary"].some((k) => k.includes(q) || q.includes(k));
  const matchesLauncherIcon =
    !q || ["launcher", "icon", "header", "title", "subtitle", "greeting", "chat", "phone", "message", "headset", "branding"].some((k) => k.includes(q) || q.includes(k));
  const matchesIntake =
    !q ||
    [
      "intake",
      "form",
      "fields",
      "name",
      "email",
      "phone",
      "mandatory",
      "visitor",
      "pre-chat",
      "requirements",
      "requirement",
      "process",
      "process entity",
      "workflow",
      "workflow prompt",
      "greeting",
      "welcome",
      "auto create",
      "contact",
      "contact category",
      "category",
    ].some((k) => k.includes(q) || q.includes(k));
  const matchesFirstResponder =
    !q || ["responder", "first responder", "ai", "bot", "human", "agent"].some((k) => k.includes(q) || q.includes(k));
  const matchesResponsible =
    !q ||
    [
      "responsible",
      "responsible settings",
      "queue",
      "team",
      "routing",
      "priority",
      "sequential",
      "round robin",
      "broadcast",
      "working hours",
      "hours",
      "schedule",
      "location",
      "branch",
    ].some((k) => k.includes(q) || q.includes(k));
  const matchesEmbed =
    !q || ["embed", "script", "code", "html", "snippet", "install", "cdn", "website", "head"].some((k) => k.includes(q) || q.includes(k));

  const totalMatches = [
    matchesPosition,
    matchesTheme,
    matchesLauncherIcon,
    matchesIntake,
    matchesFirstResponder,
    matchesResponsible,
    matchesEmbed,
  ].filter(Boolean).length;

  // Agent Queue / Responsible State
  const [agentSearch, setAgentSearch] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentSelectRef = useRef<HTMLDivElement>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

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

  // Auto-save changes to localStorage (only if not in invalid auto-create state)
  useEffect(() => {
    if (config.autoCreateClientEnabled && !config.autoCreateContactCategory) {
      return;
    }
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
    if (
      config.enablePreChatForm &&
      (config.formFields.requirement ?? true) &&
      (config.requirements || []).some((r) => !r.label.trim() || !r.entityType || !r.processId)
    ) {
      toast.error("Please map each Requirement Option to a Process Entity and Workflow Name before saving.");
      return false;
    }
    if (config.autoCreateClientEnabled && !config.autoCreateContactCategory) {
      toast.error("Please select a Contact Category for Auto Create Contact before saving.");
      return false;
    }
    saveWebsiteWidgetConfig(config);
    toast.success("Website widget settings saved successfully!");
    return true;
  };

  useEffect(() => {
    if (registerSaveHandler) {
      registerSaveHandler(handleSave);
    }
  }, [registerSaveHandler, config]);

  const handleContactCategoryChange = (newCategory: string) => {
    setConfig((prev) => ({
      ...prev,
      autoCreateContactCategory: newCategory,
    }));
  };

  const handleAddRequirement = () => {
    const defaultEntity: EntityType = "client";
    const defaultWorkflow = getWorkflowsForEntity(defaultEntity)[0];
    const newReqId = `req-${Date.now()}`;
    const newReq = {
      id: newReqId,
      label: "New Requirement",
      entityType: defaultEntity,
      processId: defaultWorkflow?.id || "",
    };
    setConfig((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), newReq],
    }));
  };

  const handleUpdateRequirement = (index: number, value: string) => {
    setConfig((prev) => {
      const updated = [...(prev.requirements || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], label: value };
      }
      return { ...prev, requirements: updated };
    });
  };

  const handleUpdateRequirementEntity = (index: number, entityType: string) => {
    const entityWorkflows = getWorkflowsForEntity(entityType);
    const firstWorkflowId = entityWorkflows[0]?.id || "";
    setConfig((prev) => {
      const updated = [...(prev.requirements || [])];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          entityType,
          processId: firstWorkflowId,
        };
      }
      return { ...prev, requirements: updated };
    });
  };

  const handleUpdateRequirementProcess = (index: number, processId: string) => {
    setConfig((prev) => {
      const updated = [...(prev.requirements || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], processId };
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
      const updated = current.includes(id) ? current.filter((i) => i !== id) : [...current, id];
      return { ...prev, agentQueue: updated };
    });
    setAgentSearch("");
  };

  const movePriority = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= (config.agentQueue || []).length) return;
    const newQueue = [...(config.agentQueue || [])];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    setConfig((prev) => ({ ...prev, agentQueue: newQueue }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) return;
    movePriority(draggedIdx, dropIndex);
    setDraggedIdx(null);
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
  data-bot-name="${(config.botName || "MantraAssist Care Bot").replace(/"/g, "&quot;")}"
  data-theme-color="${config.themeColor}"
  data-theme-mode="${config.themeMode}"
  data-position="${config.position || "bottom-right"}"
  data-first-responder="${config.firstResponder || "ai"}"
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
    const targetReqLabel = (config.formFields.requirement ?? true) && chosenReq ? chosenReq.label : undefined;

    setIsSubmitting(true);
    const result = processWebsiteVisitorSubmission({
      name: simName,
      email: simEmail,
      phone: simPhone,
      entityType: chosenReq?.entityType,
      processId: chosenReq?.processId,
      firstMessage: simMessage,
      requirementLabel: targetReqLabel,
      contactCategory: config.autoCreateClientEnabled
        ? config.autoCreateContactCategory || "Lead"
        : "Lead",
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
        `Website visitor created! Contact "${simName}" saved${reqInfo}${
          result.processName ? ` · Workflow "${result.processName}"` : ""
        }${
          config.autoCreateClientEnabled && config.autoCreateContactCategory
            ? ` under Category "${config.autoCreateContactCategory}"`
            : ""
        }.`,
        {
          action: onNavigateToInbox
            ? {
                label: "Open Inbox",
                onClick: onNavigateToInbox,
              }
            : undefined,
        }
      );
    }
  };

  const activeBranchLocation =
    availableOrgLocations.find((l) => l.name === (config.selectedLocation || availableOrgLocations[0]?.name)) ||
    availableOrgLocations[0];

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Live Widget Simulator & Position Mockup (Sticky) ── */}
        <div className="lg:col-span-5 space-y-5 sticky top-4 self-start max-h-[calc(100vh-32px)] overflow-y-auto pr-0.5">
          {/* Widget Card Container */}
          <div
            className={`rounded-2xl border border-[#E2E8F0] shadow-lg overflow-hidden transition-all max-w-[380px] w-full mx-auto lg:mx-0 ${
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
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          m.sender === "user"
                            ? "bg-[#1456f0] text-white"
                            : config.themeMode === "dark"
                            ? "bg-slate-800 text-slate-100"
                            : "bg-gray-100 text-[#1E293B]"
                        }`}
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Choose Position Grid Mockup ── */}
          {matchesPosition && (
            <div id="setting-position" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <MapPin className="w-3.5 h-3.5 text-[#1456f0]" />
                  <span>Choose Widget Position</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1456f0] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {config.position || "bottom-right"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[
                  { id: "top-left", label: "Top Left" },
                  { id: "top-center", label: "Top Center" },
                  { id: "top-right", label: "Top Right" },
                  { id: "bottom-left", label: "Bottom Left" },
                  { id: "bottom-center", label: "Bottom Center" },
                  { id: "bottom-right", label: "Bottom Right" },
                ].map((pos) => {
                  const isActive = (config.position || "bottom-right") === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => setConfig((prev) => ({ ...prev, position: pos.id as any }))}
                      className={`relative h-20 rounded-xl border-2 cursor-pointer transition-all p-1.5 flex flex-col justify-between ${
                        isActive
                          ? "border-[#1456f0] bg-blue-50/40 shadow-xs ring-2 ring-[#1456f0]/20"
                          : "border-[#E2E8F0] bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#475569]">{pos.label}</span>
                        {isActive && <Check className="w-3 h-3 text-[#1456f0]" />}
                      </div>

                      {/* Mockup Dot */}
                      {isActive && (
                        <div
                          className="absolute w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md animate-in zoom-in-75 duration-150"
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
          )}
        </div>

        {/* ── Right Column: Configuration Cards in Required Strict Order ── */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          {/* Search Feedback */}
          {q && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1456f0]" />
                <span className="font-semibold text-slate-800">
                  Showing settings matching <span className="text-[#1456f0] font-bold">&quot;{searchQuery}&quot;</span> ({totalMatches} found)
                </span>
              </div>
              {onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="text-xs text-[#1456f0] hover:underline font-semibold cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Empty Search */}
          {q && totalMatches === 0 && (
            <div className="p-8 bg-white border border-[#E2E8F0] rounded-2xl text-center space-y-2.5">
              <Sliders className="w-7 h-7 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No settings found matching &quot;{searchQuery}&quot;</h4>
              {onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="mt-2 px-3 py-1.5 bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 1: Widget Design / Position (unchanged)
          ════════════════════════════════════════════════════════════════════ */}
          {/* 1.1 Theme & Colors */}
          {matchesTheme && (
            <div id="setting-theme" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Palette className="w-4 h-4 text-[#1456f0]" />
                  <span>Theme & Colors</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.themeColor }}></span>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">{config.themeColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Widget Primary Color
                </label>
                <div className="flex items-center flex-wrap gap-2.5">
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
          )}

          {/* 1.2 Branding & Header */}
          {matchesLauncherIcon && (
            <div id="setting-launcher-icon" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
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
          )}

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 2: Pre-Chat Form
          ════════════════════════════════════════════════════════════════════ */}
          {matchesIntake && (
            <div id="setting-intake-form" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Layers className="w-4 h-4 text-[#1456f0]" />
                  <span>Pre-Chat Form</span>
                  <InfoTooltip text="Intake fields, greeting message, and auto-contact creation collected from web visitors before initiating the conversation" />
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
                  {/* Greeting Message (Inside Pre-Chat Form only) */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Greeting Message
                      </label>
                      <InfoTooltip text="Greeting displayed to visitors at the top of the pre-chat intake form" />
                    </div>
                    <textarea
                      rows={2}
                      value={config.welcomeMessage}
                      onChange={(e) => setConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                      placeholder="e.g. Hello! Welcome to Mantra Health. How can we assist you today?"
                      className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 text-[#1E293B] font-medium bg-white focus:border-[#1456f0] focus:ring-2 focus:ring-[#1456f0]/10 outline-none resize-none"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                  </div>

                  {/* Form Field Checkboxes */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Intake Fields
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
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
                              formFields: { ...prev.formFields, requirement: e.target.checked },
                            }))
                          }
                          className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                        />
                        <HelpCircle className="w-3.5 h-3.5 text-[#64748b]" /> Requirement
                      </label>
                    </div>
                  </div>

                  {/* Requirement Options List with Process Entity -> Workflow Name Mapping (No Stages) */}
                  {(config.formFields.requirement ?? true) && (
                    <div className="p-3.5 border border-[#E2E8F0] rounded-xl bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Requirement Options &amp; Workflow Mapping
                          </span>
                          <InfoTooltip text="Map each pre-chat requirement to a Process Entity and Workflow Name (no stage selection) so the AI maps the corresponding workflow prompt during conversations." />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddRequirement}
                          className="text-[11px] font-semibold text-[#1456f0] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Requirement
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(config.requirements || []).map((req, idx) => {
                          const selectedEntity = req.entityType || "client";
                          const entityWorkflows = getWorkflowsForEntity(selectedEntity);
                          return (
                            <div
                              key={req.id || idx}
                              className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white space-y-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="text"
                                  value={req.label}
                                  onChange={(e) => handleUpdateRequirement(idx, e.target.value)}
                                  placeholder="Requirement Option (e.g. Book an Appointment)"
                                  className="flex-1 min-w-0 text-xs border border-[#E2E8F0] rounded-xl p-2 bg-slate-50/60 focus:bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0]"
                                />
                                {(config.requirements || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRequirement(idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer transition-colors shrink-0"
                                    title="Remove requirement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label
                                    className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    Process Entity
                                  </label>
                                  <select
                                    value={req.entityType || ""}
                                    onChange={(e) => handleUpdateRequirementEntity(idx, e.target.value)}
                                    className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0] cursor-pointer"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    <option value="">-- Select Process Entity --</option>
                                    {processEntityOptions.map((ent) => (
                                      <option key={ent.id} value={ent.id}>
                                        {ent.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label
                                    className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    Workflow Name
                                  </label>
                                  <select
                                    value={req.processId || ""}
                                    onChange={(e) => handleUpdateRequirementProcess(idx, e.target.value)}
                                    disabled={!req.entityType}
                                    className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    <option value="">-- Select Workflow Name --</option>
                                    {entityWorkflows.map((proc) => (
                                      <option key={proc.id} value={proc.id}>
                                        {proc.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Auto Create Contact (Inside Pre-Chat Form only) */}
                  <div className="p-3.5 border border-[#E2E8F0] rounded-xl bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Auto Create Contact
                        </span>
                        <InfoTooltip text="Automatically create contact records for web visitors under a configured Contact Category" />
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
                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Contact Category
                        </label>
                        <select
                          value={config.autoCreateContactCategory || ""}
                          onChange={(e) => handleContactCategoryChange(e.target.value)}
                          className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0] cursor-pointer"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <option value="">-- Choose a Contact Category --</option>
                          {contactCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 4: First Responder (unchanged)
          ════════════════════════════════════════════════════════════════════ */}
          {matchesFirstResponder && (
            <div id="setting-first-responder" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <ShieldCheck className="w-4 h-4 text-[#1456f0]" />
                  <span>First Responder</span>
                  <InfoTooltip text="Select who responds first when a visitor initiates a chat" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-[#1456f0] border-blue-200">
                  {config.firstResponder === "ai" ? "AI Assistant" : "Human Agent"}
                </span>
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
          )}

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 5: Responsible Settings (renamed and expanded, items 4-6)
          ════════════════════════════════════════════════════════════════════ */}
          {matchesResponsible && (
            <div id="setting-responsible" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-5 shadow-xs">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Users className="w-4 h-4 text-[#1456f0]" />
                  <span>Responsible Settings</span>
                  <InfoTooltip text="Manage responsible team members, distribution routing modes, sequential priority ordering, and branch working hours." />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-[#475569] border-slate-200">
                  {config.agentQueue?.length || 0} Members Assigned
                </span>
              </div>

              {/* 5.1 Working Hours (Moved inside Responsible Settings only, item 6) */}
              <div className="p-4 border border-[#E2E8F0] rounded-xl bg-slate-50/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1456f0]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Branch &amp; Working Hours Restriction
                    </span>
                    <InfoTooltip text="Only route chats during configured working hours, and filter responsible members to those available at the selected branch" />
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
                  <div className="space-y-3.5 pt-1">
                    {/* Branch / Location Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Select Organization Branch
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

                    {/* Synced Branch Schedule Card */}
                    {activeBranchLocation && (
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <Building2 className="w-3.5 h-3.5 text-[#1456f0]" />
                            <span>{activeBranchLocation.name}</span>
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Synced from Org Data
                          </span>
                        </div>
                        <div className="text-[11px] text-[#475569] space-y-0.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          <div><strong className="text-[#1E293B]">Address:</strong> {activeBranchLocation.address}</div>
                          <div><strong className="text-[#1E293B]">Hours:</strong> {activeBranchLocation.schedule}</div>
                          <div><strong className="text-[#1E293B]">Timezone:</strong> {activeBranchLocation.timezone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5.2 Responsible Team Members (Item 4) */}
              <div className="space-y-1.5" ref={agentSelectRef}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Responsible Team Members ({config.agentQueue?.length || 0} assigned)
                    </label>
                    <InfoTooltip text="Only organization team members can be assigned. Members are checked for branch availability." />
                  </div>
                </div>

                {/* Selected members pill box */}
                <div
                  onClick={() => setAgentDropdownOpen(true)}
                  className="min-h-[44px] p-2 border border-[#E2E8F0] rounded-xl bg-white flex flex-wrap items-center gap-1.5 cursor-text focus-within:border-[#1456f0] focus-within:ring-2 focus-within:ring-[#1456f0]/10 transition-all"
                >
                  {(config.agentQueue || []).map((id) => {
                    const member = orgTeamMembers.find((m) => String(m.id) === String(id));
                    if (!member) return null;
                    const custom = config.customProfiles?.[id];
                    const name = custom?.name || member.name;
                    const avatar = custom?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1E293B&color=fff`;
                    const isAvailable = isMemberAvailableForBranch(member, config.selectedLocation);

                    return (
                      <span
                        key={id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
                          !isAvailable && config.workHoursEnabled
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-slate-100 border-slate-200 text-[#1E293B]"
                        }`}
                      >
                        <img src={avatar} alt={name} className="w-4 h-4 rounded-full object-cover" />
                        <span>{name}</span>
                        {!isAvailable && config.workHoursEnabled && (
                          <span className="text-[9px] text-amber-600 font-normal">(Off Branch)</span>
                        )}
                        <X
                          className="w-3 h-3 text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
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
                    placeholder={(config.agentQueue || []).length === 0 ? "Search organization team members to assign..." : "Add more team members..."}
                    className="flex-1 text-xs outline-none bg-transparent min-w-[140px] text-[#1E293B]"
                  />
                </div>

                {/* Team Members Dropdown List */}
                {agentDropdownOpen && (
                  <div className="border border-[#E2E8F0] rounded-xl bg-white shadow-lg max-h-52 overflow-y-auto mt-1 p-1 z-30">
                    {orgTeamMembers
                      .filter(
                        (m) =>
                          !(config.agentQueue || []).includes(String(m.id)) &&
                          (m.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                            m.email.toLowerCase().includes(agentSearch.toLowerCase()) ||
                            (m.role || "").toLowerCase().includes(agentSearch.toLowerCase()))
                      )
                      .map((m) => {
                        const isAvailable = isMemberAvailableForBranch(m, config.selectedLocation);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleQueueAgent(String(m.id))}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1E293B&color=fff`}
                                alt={m.name}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E293B] truncate">{m.name}</div>
                                <div className="text-[10px] text-[#64748b] truncate">
                                  {m.role || m.department || m.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {config.workHoursEnabled && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                    isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {isAvailable ? "Available in Branch" : "Other Branch"}
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-[#1456f0]">+ Add</span>
                            </div>
                          </div>
                        );
                      })}
                    {orgTeamMembers.filter(
                      (m) =>
                        !(config.agentQueue || []).includes(String(m.id)) &&
                        m.name.toLowerCase().includes(agentSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-3 text-center text-xs text-[#94a3b8]">No organization members found</div>
                    )}
                  </div>
                )}
              </div>

              {/* 5.3 Distribution Mode Dropdown (Item 4) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Distribute Submissions Among Employees
                  </label>
                  <InfoTooltip text="Routing strategy: Simultaneous broadcast to all members, round-robin load balancing, or sequential priority order" />
                </div>
                <select
                  value={config.distribution}
                  onChange={(e) => setConfig((prev) => ({ ...prev, distribution: e.target.value as any }))}
                  className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0] cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <option value="To everybody">Simultaneous broadcast (To everybody)</option>
                  <option value="Evenly">Round-robin (Evenly distribute)</option>
                  <option value="Exactly as enqueued">Sequential priority (Exactly as enqueued)</option>
                </select>
              </div>

              {/* 5.4 Priority Assignment for Sequential Mode (Item 5 - Hidden for other modes) */}
              {config.distribution === "Exactly as enqueued" && (
                <div className="p-4 border border-blue-100 rounded-xl bg-blue-50/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-blue-100/60 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Sequential Routing Priority
                      </span>
                      <InfoTooltip text="Priority 1 receives the chat first. If unavailable or unanswered, falls through to Priority 2, 3, etc. Drag to reorder priority." />
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {config.agentQueue.length} {config.agentQueue.length === 1 ? "member" : "members"} ordered
                    </span>
                  </div>

                  {(config.agentQueue || []).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Assign team members above to configure sequential priority order.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {config.agentQueue.map((agentId, index) => {
                        const member = orgTeamMembers.find((m) => String(m.id) === String(agentId));
                        if (!member) return null;
                        const custom = config.customProfiles?.[agentId];
                        const name = custom?.name || member.name;
                        const role = custom?.position || member.role || "Team Member";
                        const isAvailable = isMemberAvailableForBranch(member, config.selectedLocation);

                        return (
                          <div
                            key={agentId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all shadow-2xs ${
                              draggedIdx === index ? "opacity-50 border-blue-400 bg-blue-50/40" : "border-[#E2E8F0] hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Drag handle */}
                              <div
                                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
                                title="Drag to reorder priority"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Numbered Priority Badge */}
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  index === 0
                                    ? "bg-[#1456f0] text-white shadow-xs"
                                    : "bg-slate-100 text-[#475569] border border-slate-200"
                                }`}
                              >
                                {index + 1}
                              </div>

                              {/* Member Avatar */}
                              <div className="relative shrink-0">
                                <img
                                  src={
                                    custom?.image ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1E293B&color=fff`
                                  }
                                  alt={name}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                />
                                {config.workHoursEnabled && (
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                                      isAvailable ? "bg-emerald-500" : "bg-amber-400"
                                    }`}
                                  />
                                )}
                              </div>

                              {/* Member Details */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-[#1E293B] truncate">{name}</span>
                                  {index === 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-[#1456f0] border border-blue-200">
                                      Priority 1 (First Responder)
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                      Fallback #{index}
                                    </span>
                                  )}
                                  {!isAvailable && config.workHoursEnabled && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      Off Branch
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#64748b] truncate">{role}</div>
                              </div>
                            </div>

                            {/* Remove button */}
                            <div className="flex items-center shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleQueueAgent(agentId)}
                                className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 5.5 Agent Information Display Mode */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Agent Information Display Mode
                  </label>
                  <InfoTooltip text="Choose how agent identities appear to website visitors: actual account, custom alias/avatar, or anonymous" />
                </div>
                <select
                  value={config.agentDisplay}
                  onChange={(e) => setConfig((prev) => ({ ...prev, agentDisplay: e.target.value as any }))}
                  className="w-full text-xs border border-[#E2E8F0] rounded-xl p-2.5 bg-white text-[#1E293B] font-medium outline-none focus:border-[#1456f0] cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <option value="user">User Profile (Show actual account info)</option>
                  <option value="custom">Use Custom Profile (Mask real identity)</option>
                  <option value="hide">Hide User Information (Anonymous agent)</option>
                </select>

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
                        No team members in queue. Add members in the Responsible Settings above.
                      </div>
                    ) : (
                      (config.agentQueue || []).map((id) => {
                        const base = orgTeamMembers.find((m) => String(m.id) === String(id));
                        if (!base) return null;
                        const custom = config.customProfiles?.[id] || {};
                        const displayName = custom.name !== undefined ? custom.name : base.name;
                        const displayPosition = custom.position !== undefined ? custom.position : base.role || "Care Coordinator";
                        const displayImage =
                          custom.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(base.name)}&background=1E293B&color=fff`;

                        return (
                          <div key={id} className="p-3.5 border border-[#E2E8F0] rounded-xl bg-blue-50/20 space-y-3 relative">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#64748b] text-[11px] flex items-center gap-1.5">
                                <img src={displayImage} alt={base.name} className="w-4 h-4 rounded-full opacity-60" />
                                Customizing for: <strong className="text-[#1E293B]">{base.name}</strong>
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

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 6: Widget Installation & Embed Code (at the bottom)
          ════════════════════════════════════════════════════════════════════ */}
          {matchesEmbed && (
            <div id="setting-embed-code" className="scroll-mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Code className="w-4 h-4 text-[#1456f0]" />
                  <span>Widget Installation &amp; Embed Code</span>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#64748b]">
                  <span className="font-mono text-[11px]">&lt;&gt; Website Embed Snippet</span>
                  <span>Place before &lt;/body&gt;</span>
                </div>
                <div className="relative bg-[#0F172A] rounded-xl p-3.5 overflow-x-auto text-xs font-mono text-slate-200 border border-slate-800">
                  <pre>{embedScriptSnippet}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
