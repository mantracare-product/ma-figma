import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  MessageCircle,
  MessageSquare,
  Search,
  Check,
  CheckCheck,
  Paperclip,
  Send,
  Plus,
  Trash2,
  Link2,
  Pencil,
  Info,
  X,
  FileText,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  BarChart2,
  Users,
  Zap,
  Bot,
  Settings,
  Clock,
  TrendingUp,
  Eye,
  MousePointer,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ArrowRight,
  Filter,
  MoreVertical,
  Globe,
  MessageCircle as ChatIcon,
  UserCheck,
  Shield,
  Calendar,
  Volume2,
  Phone,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ─── Type Definitions ────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "contact" | "me";
  status?: "sent" | "delivered" | "read";
}

interface Conversation {
  id: string;
  contactName: string;
  phoneNumber: string;
  channel: "whatsapp" | "sms";
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "open" | "resolved";
  messages: Message[];
}

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

interface CampaignNode {
  id: string;
  type: "message" | "delay" | "condition" | "end";
  label: string;
  content?: string;
  templateIdentifier?: string;
  delayValue?: number;
  delayUnit?: "minutes" | "hours" | "days";
  conditionFieldSource?: string;
  conditionField?: string;
  conditionOp?: string;
  conditionValue?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  audience: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  createdAt: string;
  nodes: CampaignNode[];
}

interface BusinessInfoItem {
  id: number;
  title: string;
  information: string;
  active: boolean;
}

interface EscalationRule {
  id: string;
  keyword: string;
  responsiblePersonId: string;
  enabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin", "Arabic", "Portuguese", "Russian", "Japanese"];

const FETCH_FIELD_SOURCES = [
  {
    value: "system", label: "System Fields", fields: [
      { value: "contact_name", label: "Contact Name" },
      { value: "contact_email", label: "Contact Email" },
      { value: "contact_phone", label: "Contact Phone" },
      { value: "country", label: "Country" },
      { value: "language", label: "Language" },
    ]
  },
  {
    value: "call-log", label: "Call Log Fields", fields: [
      { value: "call_status", label: "Call Status" },
      { value: "call_duration", label: "Call Duration" },
      { value: "call_sentiment", label: "Sentiment" },
      { value: "call_summary", label: "Call Summary" },
    ]
  },
  {
    value: "appointment", label: "Appointment Fields", fields: [
      { value: "appointment_date", label: "Appointment Date" },
      { value: "appointment_time", label: "Appointment Time" },
      { value: "appointment_status", label: "Appointment Status" },
    ]
  },
];

const AVAILABLE_EMPLOYEES = [
  { id: "1", name: "Sarah Johnson" },
  { id: "2", name: "Michael Chen" },
  { id: "3", name: "Emily Rodriguez" },
  { id: "4", name: "James Wilson" },
  { id: "5", name: "Lisa Thompson" },
];

const INITIAL_MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    contactName: "Sarah Jenkins",
    phoneNumber: "+1 (555) 234-5678",
    channel: "whatsapp",
    lastMessage: "I wanted to change my appointment slot to 3:00 PM if possible.",
    timestamp: "10:35 AM",
    unreadCount: 2,
    status: "open",
    messages: [
      { id: "msg-1-1", text: "Hello! Thank you for contacting Mantra Health.", timestamp: "10:30 AM", sender: "me", status: "read" },
      { id: "msg-1-2", text: "Could I reschedule my appointment for tomorrow?", timestamp: "10:32 AM", sender: "contact" },
      { id: "msg-1-3", text: "I wanted to change my appointment slot to 3:00 PM if possible.", timestamp: "10:35 AM", sender: "contact" },
    ],
  },
  {
    id: "conv-2",
    contactName: "Michael Chang",
    phoneNumber: "+1 (555) 876-5432",
    channel: "sms",
    lastMessage: "Thanks, I will confirm by tonight.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-2-1", text: "Hi Michael, your lab reports have been received.", timestamp: "Yesterday, 4:15 PM", sender: "me", status: "read" },
      { id: "msg-2-2", text: "Thanks, I will confirm by tonight.", timestamp: "Yesterday, 4:20 PM", sender: "contact" },
    ],
  },
  {
    id: "conv-3",
    contactName: "Elena Rostova",
    phoneNumber: "+1 (555) 345-6789",
    channel: "whatsapp",
    lastMessage: "Awesome service! Thanks for checking in.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-3-1", text: "Hello Elena, how is your recovery progressing?", timestamp: "Yesterday, 11:00 AM", sender: "me", status: "read" },
      { id: "msg-3-2", text: "Awesome service! Thanks for checking in.", timestamp: "Yesterday, 11:15 AM", sender: "contact" },
    ],
  },
];

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp-1",
    name: "Post-Visit Follow-up",
    status: "active",
    audience: "Patients visited in last 7 days",
    sent: 342,
    delivered: 330,
    opened: 210,
    clicked: 87,
    createdAt: "2026-06-20",
    nodes: [
      { id: "n1", type: "message", label: "Welcome Message", content: "Hi {{contact_name}}, thank you for visiting us!", templateIdentifier: "" },
      { id: "n2", type: "delay", label: "Wait 2 Days", delayValue: 2, delayUnit: "days" },
      { id: "n3", type: "message", label: "Feedback Request", content: "We'd love to hear your feedback.", templateIdentifier: "" },
      { id: "n4", type: "end", label: "End Flow" },
    ],
  },
  {
    id: "cmp-2",
    name: "Appointment Reminder Series",
    status: "active",
    audience: "Upcoming appointments (next 48h)",
    sent: 156,
    delivered: 154,
    opened: 148,
    clicked: 62,
    createdAt: "2026-06-22",
    nodes: [
      { id: "n1", type: "message", label: "Reminder Day Before", content: "Hi {{contact_name}}! Reminder: your appointment is tomorrow.", templateIdentifier: "" },
      { id: "n2", type: "delay", label: "Wait 20 Hours", delayValue: 20, delayUnit: "hours" },
      { id: "n3", type: "message", label: "Same-Day Reminder", content: "Your appointment is today! See you soon. 🏥", templateIdentifier: "" },
      { id: "n4", type: "end", label: "End Flow" },
    ],
  },
  {
    id: "cmp-3",
    name: "New Lead Nurture",
    status: "draft",
    audience: "New leads (last 30 days)",
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    createdAt: "2026-06-27",
    nodes: [
      { id: "n1", type: "message", label: "Introduction", content: "Hi {{contact_name}}, welcome!", templateIdentifier: "" },
      { id: "n2", type: "end", label: "End Flow" },
    ],
  },
];

const STATUS_COLOR: Record<Campaign["status"], string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
};

const NODE_TYPE_COLOR: Record<CampaignNode["type"], string> = {
  message: "bg-blue-50 border-blue-200 text-blue-700",
  delay: "bg-yellow-50 border-yellow-200 text-yellow-700",
  condition: "bg-purple-50 border-purple-200 text-purple-700",
  end: "bg-gray-50 border-gray-200 text-gray-500",
};

const NODE_TYPE_ICON: Record<CampaignNode["type"], React.ReactNode> = {
  message: <MessageCircle className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
  condition: <Filter className="w-4 h-4" />,
  end: <CheckCircle2 className="w-4 h-4" />,
};

const getInitials = (name: string) => name.split(" ").map(p => p[0]).join("").toUpperCase().substring(0, 2);

// ─── Collapsible Accordion Section (Process.tsx-style) ────────────────────────

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title, icon, iconBg, children, defaultOpen = false, badge, badgeColor = "bg-gray-100 text-gray-600"
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <span className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>{title}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/30">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Collapsible Sidebar Section ──────────────────────────────────────────────

interface CollapsibleSidebarSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  onAddNew: () => void;
  addLabel: string;
  children: React.ReactNode;
}

const CollapsibleSidebarSection: React.FC<CollapsibleSidebarSectionProps> = ({
  title, count, defaultOpen = true, onAddNew, addLabel, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between mb-1 group"
      >
        <div className="flex items-center gap-1.5">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{title}</h3>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{count}</span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onAddNew(); }}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onAddNew(); } }}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />{addLabel}
        </span>
      </button>
      {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
};

// ─── Variable Picker ──────────────────────────────────────────────────────────

interface VariablePickerButtonProps {
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
}

const VariablePickerButton: React.FC<VariablePickerButtonProps> = ({ targetRef, value, onChange, label = "Insert Variable" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  const handleSelectField = (fieldValue: string) => {
    const textarea = targetRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const insertText = `{{${fieldValue}}}`;
    const newValue = (value || "").slice(0, start) + insertText + (value || "").slice(end);
    onChange(newValue);
    setIsOpen(false);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const openDropdown = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (dropdownPanelRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setIsOpen(false));
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button ref={buttonRef} type="button" onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </button>
      {isOpen && dropdownPos && createPortal(
        <>
          <div className="fixed inset-0 cursor-default" style={{ zIndex: 9998 }} onClick={() => setIsOpen(false)} />
          <div ref={dropdownPanelRef} className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden flex flex-col"
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, width: '256px', maxHeight: '256px', zIndex: 9999 }}>
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase" style={{ fontFamily: 'Outfit, sans-serif' }}>Insert Field Variable</span>
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {FETCH_FIELD_SOURCES.map(group => (
                <div key={group.value}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/30 border-y border-gray-100/50" style={{ fontFamily: 'Outfit, sans-serif' }}>{group.label}</div>
                  <div className="py-0.5">
                    {group.fields.map(field => (
                      <button key={field.value} type="button" onClick={() => handleSelectField(field.value)}
                        className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        <span>{field.label}</span>
                        <span className="text-[9px] text-gray-400 font-mono">{`{{${field.value}}}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

// ─── Campaign Builder (hoisted outside main component) ────────────────────────

interface CampaignBuilderViewProps {
  campaignForm: { name: string; audience: string };
  setCampaignForm: React.Dispatch<React.SetStateAction<{ name: string; audience: string }>>;
  campaignNodes: CampaignNode[];
  setCampaignNodes: React.Dispatch<React.SetStateAction<CampaignNode[]>>;
  editingNodeId: string | null;
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  editingCampaignId: string | null;
  globalTemplates: WhatsappTemplate[];
  handleAddNode: (type: CampaignNode["type"]) => void;
  handleSaveCampaign: () => void;
  onBack: () => void;
  backLabel?: string;
}

const CampaignBuilderView: React.FC<CampaignBuilderViewProps> = ({
  campaignForm, setCampaignForm, campaignNodes, setCampaignNodes,
  editingNodeId, setEditingNodeId, editingCampaignId, globalTemplates,
  handleAddNode, handleSaveCampaign, onBack, backLabel = "Cancel",
}) => (
  <div className="flex gap-6 items-start">
    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <input type="text" value={campaignForm.name} onChange={e => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Campaign name..." className="text-xl font-bold text-gray-900 outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors pb-0.5 bg-transparent"
            style={{ fontFamily: "DM Sans, sans-serif" }} />
          <input type="text" value={campaignForm.audience} onChange={e => setCampaignForm(prev => ({ ...prev, audience: e.target.value }))}
            placeholder="Target audience (e.g. All new leads)" className="block text-sm text-gray-500 outline-none mt-1 bg-transparent w-full"
            style={{ fontFamily: "Outfit, sans-serif" }} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>{backLabel}</Button>
          <Button variant="primary" onClick={handleSaveCampaign}>{editingCampaignId ? "Update Campaign" : "Save Campaign"}</Button>
        </div>
      </div>
      <div className="p-6 space-y-0 max-h-[calc(100vh-340px)] overflow-y-auto">
        {campaignNodes.map((node, idx) => (
          <div key={node.id}>
            <div className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${editingNodeId === node.id ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-300"} ${node.type === "end" ? "opacity-60" : ""}`}
              onClick={() => node.type !== "end" && setEditingNodeId(editingNodeId === node.id ? null : node.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${NODE_TYPE_COLOR[node.type]}`}>{NODE_TYPE_ICON[node.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{node.label}</p>
                  {node.type === "message" && node.content && (
                    <p className="text-xs text-gray-500 truncate mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{node.content}</p>
                  )}
                  {node.type === "delay" && node.delayValue && (
                    <p className="text-xs text-yellow-600 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>Wait {node.delayValue} {node.delayUnit}</p>
                  )}
                </div>
                {node.type !== "end" && (
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg" onClick={e => { e.stopPropagation(); setCampaignNodes(prev => prev.filter(n => n.id !== node.id)); toast.success("Step removed"); }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
            {idx < campaignNodes.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <div className="w-px h-4 bg-gray-300" />
                <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
                <div className="w-px h-1 bg-gray-300" />
              </div>
            )}
          </div>
        ))}
        <div className="pt-4 flex flex-wrap gap-2 justify-center">
          {(["message", "delay", "condition"] as const).map(type => (
            <button key={type} onClick={() => handleAddNode(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all hover:shadow-sm ${NODE_TYPE_COLOR[type]}`}
              style={{ fontFamily: "DM Sans, sans-serif" }}>
              <Plus className="w-3.5 h-3.5" />Add {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
    <div className="w-[260px] shrink-0 space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Flow Summary</h4>
        <div className="space-y-2 text-xs text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div className="flex justify-between"><span>Messages</span><span className="font-semibold text-blue-600">{campaignNodes.filter(n => n.type === "message").length}</span></div>
          <div className="flex justify-between"><span>Delays</span><span className="font-semibold text-yellow-600">{campaignNodes.filter(n => n.type === "delay").length}</span></div>
          <div className="flex justify-between"><span>Total Steps</span><span className="font-semibold">{campaignNodes.length}</span></div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Chats() {
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const TAB_ORDER = ["chats", "campaigns", "templates", "chatbot"] as const;
  type TabKey = typeof TAB_ORDER[number];
  const [activeTab, setActiveTab] = useState<TabKey>("chats");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "templates") setActiveTab("templates");
    else if (tabParam === "campaigns") setActiveTab("campaigns");
    else if (tabParam === "chatbot") setActiveTab("chatbot");
    else setActiveTab("chats");
  }, [location.search]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    navigate(`/chats?tab=${tab}`, { replace: true });
  };

  // ── Chats State ──
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = localStorage.getItem("whatsappMockConversations");
    return stored ? JSON.parse(stored) : INITIAL_MOCK_CONVERSATIONS;
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string>("conv-1");
  const [chatSearch, setChatSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "sms">("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [composerText, setComposerText] = useState("");
  const [showUseTemplateDropdown, setShowUseTemplateDropdown] = useState(false);

  useEffect(() => { localStorage.setItem("whatsappMockConversations", JSON.stringify(conversations)); }, [conversations]);

  const activeConversation = conversations.find(c => c.id === selectedConversationId);

  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0) {
      setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedConversationId]);

  const handleMarkResolved = () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === "open" ? "resolved" : "open";
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, status: newStatus } : c));
    toast.success(`Conversation marked as ${newStatus}`);
  };

  const handleSendMessage = () => {
    if (!composerText.trim() || !activeConversation) return;
    const newMessage: Message = { id: `msg-${Date.now()}`, text: composerText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sender: "me", status: "read" };
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, lastMessage: composerText, timestamp: "Just now", messages: [...c.messages, newMessage] } : c));
    setComposerText("");
    toast.success("Message sent");
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) || c.phoneNumber.includes(chatSearch) || c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
    const matchesChannel = channelFilter === "all" ? true : c.channel === channelFilter;
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  // ── Templates State ──
  const [globalTemplates, setGlobalTemplates] = useState<WhatsappTemplate[]>(() => {
    const stored = localStorage.getItem("whatsappGlobalTemplates");
    return stored ? JSON.parse(stored) : [];
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showBuilderForm, setShowBuilderForm] = useState(false);
  const [templateForm, setTemplateForm] = useState<Omit<WhatsappTemplate, "id" | "createdAt">>({
    name: "", identifier: "", category: "Marketing", language: "English",
    header: { type: "none", content: "" }, bodyText: "", footerText: "", buttons: [],
  });
  const [showCampaignBuilderInTemplates, setShowCampaignBuilderInTemplates] = useState(false);

  useEffect(() => { localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(globalTemplates)); }, [globalTemplates]);

  const handleNameChange = (nameVal: string) => {
    const identifierVal = nameVal.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    setTemplateForm(prev => ({ ...prev, name: nameVal, identifier: editingTemplateId ? prev.identifier : identifierVal }));
  };

  const handleAddButton = () => {
    if (templateForm.buttons.length >= 3) { toast.error("You can add a maximum of 3 buttons."); return; }
    setTemplateForm(prev => ({ ...prev, buttons: [...prev.buttons, { type: "quick_reply", label: "", value: "" }] }));
  };

  const handleRemoveButton = (index: number) => {
    setTemplateForm(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }));
  };

  const handleButtonChange = (index: number, key: string, value: string) => {
    setTemplateForm(prev => ({ ...prev, buttons: prev.buttons.map((btn, i) => i === index ? { ...btn, [key]: value } : btn) }));
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ name: "", identifier: "", category: "Marketing", language: "English", header: { type: "none", content: "" }, bodyText: "", footerText: "", buttons: [] });
    setShowBuilderForm(true);
    setShowCampaignBuilderInTemplates(false);
  };

  const handleEditTemplate = (tpl: WhatsappTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateForm({ name: tpl.name, identifier: tpl.identifier, category: tpl.category, language: tpl.language, header: tpl.header || { type: "none", content: "" }, bodyText: tpl.bodyText, footerText: tpl.footerText || "", buttons: tpl.buttons || [] });
    setShowBuilderForm(true);
    setShowCampaignBuilderInTemplates(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setGlobalTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted successfully");
      if (editingTemplateId === id) { setShowBuilderForm(false); setEditingTemplateId(null); }
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim()) { toast.error("Template name is required"); return; }
    if (!templateForm.identifier.trim()) { toast.error("Template identifier is required"); return; }
    if (!templateForm.bodyText.trim()) { toast.error("Template body text is required"); return; }
    const isDuplicate = globalTemplates.some(t => t.identifier.toLowerCase() === templateForm.identifier.toLowerCase() && t.id !== editingTemplateId);
    if (isDuplicate) { toast.error("Template identifier must be unique"); return; }
    if (editingTemplateId) {
      setGlobalTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, ...templateForm } : t));
      toast.success("Template updated successfully");
    } else {
      const newTemplate: WhatsappTemplate = { id: `tpl-${Date.now()}`, ...templateForm, createdAt: new Date().toISOString() };
      setGlobalTemplates(prev => [...prev, newTemplate]);
      toast.success("Template created successfully");
    }
    setShowBuilderForm(false);
    setEditingTemplateId(null);
  };

  // ── Campaign State ──
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [openMenuCampaignId, setOpenMenuCampaignId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({ name: "", audience: "" });
  const [campaignNodes, setCampaignNodes] = useState<CampaignNode[]>([
    { id: "n1", type: "message", label: "Message 1", content: "", templateIdentifier: "" },
    { id: "n2", type: "end", label: "End Flow" },
  ]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (openMenuCampaignId === null) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.campaign-menu-container') && !(e.target as HTMLElement).closest('.campaign-menu-portal')) {
        setOpenMenuCampaignId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuCampaignId]);

  const handleToggleMenu = (campaignId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuCampaignId === campaignId) { setOpenMenuCampaignId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuCampaignId(campaignId);
  };

  const handleToggleCampaign = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status;
      toast.success(`Campaign ${next === "active" ? "resumed" : "paused"}`);
      return { ...c, status: next };
    }));
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Delete this campaign?")) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campaign deleted");
    }
  };

  const handleOpenView = (campaign: Campaign) => { setViewingCampaign(campaign); setViewDrawerOpen(true); setOpenMenuCampaignId(null); };

  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setCampaignForm({ name: campaign.name, audience: campaign.audience });
    setCampaignNodes(campaign.nodes.map(n => ({ ...n })));
    setShowCampaignBuilder(true);
    setOpenMenuCampaignId(null);
  };

  const handleOpenCreate = () => {
    setEditingCampaignId(null);
    setCampaignForm({ name: "", audience: "" });
    setCampaignNodes([
      { id: "n1", type: "message", label: "Message 1", content: "", templateIdentifier: "" },
      { id: "n2", type: "end", label: "End Flow" },
    ]);
    setShowCampaignBuilder(true);
  };

  const handleNewCampaignFromAnywhere = () => {
    setShowBuilderForm(false);
    setShowCampaignBuilderInTemplates(true);
    handleOpenCreate();
    handleTabChange("templates");
  };

  const handleAddNode = (type: CampaignNode["type"]) => {
    const newNode: CampaignNode = {
      id: `n${Date.now()}`,
      type,
      label: type === "message" ? "New Message" : type === "delay" ? "Wait" : type === "condition" ? "Check Condition" : "End Flow",
      content: type === "message" ? "" : undefined,
      templateIdentifier: type === "message" ? "" : undefined,
      delayValue: type === "delay" ? 1 : undefined,
      delayUnit: type === "delay" ? "days" : undefined,
    };
    setCampaignNodes(prev => {
      const withoutEnd = prev.filter(n => n.type !== "end");
      return [...withoutEnd, newNode, { id: `end-${Date.now()}`, type: "end", label: "End Flow" }];
    });
    setEditingNodeId(newNode.id);
  };

  const handleSaveCampaign = () => {
    if (!campaignForm.name.trim()) { toast.error("Campaign name is required"); return; }
    if (editingCampaignId) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? { ...c, name: campaignForm.name, audience: campaignForm.audience || "All contacts", nodes: campaignNodes } : c));
      toast.success("Campaign updated successfully");
    } else {
      const newCampaign: Campaign = {
        id: `cmp-${Date.now()}`, name: campaignForm.name, status: "draft",
        audience: campaignForm.audience || "All contacts", sent: 0, delivered: 0, opened: 0, clicked: 0,
        createdAt: new Date().toISOString().split("T")[0], nodes: campaignNodes,
      };
      setCampaigns(prev => [...prev, newCampaign]);
      toast.success("Campaign saved as draft");
    }
    setShowCampaignBuilder(false);
    setShowCampaignBuilderInTemplates(false);
    setEditingCampaignId(null);
  };

  // ── Chatbot State ──
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState("Hello! 👋 Welcome to Mantra Health. How can I help you today?");
  const [aiObjective, setAiObjective] = useState("You are a helpful AI assistant for Mantra Health. Your goal is to answer patient questions, help schedule appointments, and provide information about our services. Always be empathetic, concise, and professional. Escalate to a human when the patient asks for one.");
  const [businessInfoItems, setBusinessInfoItems] = useState<BusinessInfoItem[]>([
    { id: 1, title: "Clinic Hours", information: "Monday–Saturday, 9 AM – 7 PM. Closed on Sundays and public holidays.", active: true },
    { id: 2, title: "Services Offered", information: "General consultation, lab tests, physiotherapy, and specialist referrals.", active: true },
  ]);
  const [showBusinessInfoForm, setShowBusinessInfoForm] = useState(false);
  const [businessInfoFormData, setBusinessInfoFormData] = useState({ title: "", information: "", active: true });
  const [editingBusinessInfoId, setEditingBusinessInfoId] = useState<number | null>(null);

  // Business Hours
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(true);
  const [afterHoursPersonId, setAfterHoursPersonId] = useState("");
  const [offlineMessage, setOfflineMessage] = useState("We're currently offline. We'll get back to you during business hours (Mon–Sat, 9AM–7PM).");

  // Human Handoff
  const [handoffEnabled, setHandoffEnabled] = useState(true);
  const [handoffKeyword, setHandoffKeyword] = useState("human");
  const [handoffPersonId, setHandoffPersonId] = useState("");

  // Appointment Booking
  const [appointmentBookingEnabled, setAppointmentBookingEnabled] = useState(true);
  const [appointmentCampaignId, setAppointmentCampaignId] = useState("");
  const [appointmentPersonId, setAppointmentPersonId] = useState("");

  // Escalation Rules (Advance tab)
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([
    { id: "esc-1", keyword: "cancel subscription", responsiblePersonId: "2", enabled: true },
    { id: "esc-2", keyword: "complaint", responsiblePersonId: "1", enabled: true },
  ]);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [editingEscalationId, setEditingEscalationId] = useState<string | null>(null);
  const [escalationForm, setEscalationForm] = useState({ keyword: "", responsiblePersonId: "" });

  // Fallback / AI Model (Advance tab)
  const [fallbackMessage, setFallbackMessage] = useState("I'm not sure I understood that. Could you rephrase, or would you like to speak with a team member?");
  const [aiModelTier, setAiModelTier] = useState("Balanced");
  const [aiVoiceStyle, setAiVoiceStyle] = useState("Professional");

  const handleSaveEscalation = () => {
    if (!escalationForm.keyword.trim() || !escalationForm.responsiblePersonId) {
      toast.error("Keyword and responsible person are required");
      return;
    }
    if (editingEscalationId) {
      setEscalationRules(prev => prev.map(r => r.id === editingEscalationId ? { ...r, ...escalationForm } : r));
      toast.success("Rule updated");
    } else {
      setEscalationRules(prev => [...prev, { id: `esc-${Date.now()}`, ...escalationForm, enabled: true }]);
      toast.success("Rule added");
    }
    setShowEscalationForm(false);
    setEditingEscalationId(null);
    setEscalationForm({ keyword: "", responsiblePersonId: "" });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-6">
        <PageHeader title="Chats" subtitle="Message clients over WhatsApp and SMS, and set up automated chat campaigns">
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Chats Works" />
        </PageHeader>

        {/* Tab Bar */}
        <div className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded-xl shadow-sm">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            {TAB_ORDER.map(tab => {
              const label = tab === "chatbot" ? "Chatbot" : tab === "campaigns" ? "Campaigns" : tab === "templates" ? "Template Builder" : "Chats";
              const tooltipText = tab === "chats"
                ? "Real-time inbox to chat with patients over SMS or WhatsApp."
                : tab === "campaigns"
                ? "Send a message to many clients at once, on a schedule."
                : tab === "templates"
                ? "Build pre-approved message templates for WhatsApp."
                : "Configure the automated assistant to reply to common queries.";
              return (
                <div key={tab} className="flex items-center gap-1">
                  <button onClick={() => handleTabChange(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                    style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {label}
                  </button>
                  <InfoTooltip text={tooltipText} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: CHATS INBOX
        ══════════════════════════════════════════════════════ */}
        {activeTab === "chats" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex h-[calc(100vh-250px)] overflow-hidden">
            {/* Left Pane */}
            <div className="w-[320px] border-r border-gray-200 flex flex-col h-full" style={{ backgroundColor: '#F8FAFC' }}>
              {/* Search */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                    placeholder="Search conversations..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    style={{ fontFamily: "Outfit, sans-serif" }} />
                </div>
              </div>
              {/* Filters */}
              <div className="px-4 py-2.5 border-b border-gray-200 bg-white space-y-2">
                <div className="flex gap-1">
                  {(["all", "whatsapp", "sms"] as const).map(ch => (
                    <button key={ch} onClick={() => setChannelFilter(ch)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${channelFilter === ch ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {ch === "all" ? "All" : ch === "whatsapp" ? "WhatsApp" : "SMS"}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="h-7 text-xs rounded-lg border-gray-200 w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>No conversations found.</div>
                ) : filteredConversations.map(conv => {
                  const isSelected = conv.id === selectedConversationId;
                  return (
                    <div key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                      className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-blue-50/30 transition-all border-l-2 border-b border-gray-100 ${isSelected ? "bg-blue-50 border-l-blue-600" : "border-l-transparent bg-white"}`}>
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
                          {getInitials(conv.contactName)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm" style={{ width: '18px', height: '18px' }}>
                          {conv.channel === "whatsapp" ? <MessageCircle className="w-3 h-3 text-[#25D366]" /> : <MessageSquare className="w-3 h-3 text-blue-600" />}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-gray-900"}`} style={{ fontFamily: "DM Sans, sans-serif" }}>{conv.contactName}</h4>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2" style={{ fontFamily: "Outfit, sans-serif" }}>{conv.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{conv.lastMessage}</p>
                        {conv.status === "resolved" && (
                          <span className="inline-block mt-1 text-[9px] font-semibold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Resolved</span>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{conv.unreadCount}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane — Chat Window */}
            <div className="flex-1 flex flex-col h-full bg-white">
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {getInitials(activeConversation.contactName)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{activeConversation.contactName}</h3>
                        <p className="text-xs text-gray-400 font-mono">{activeConversation.phoneNumber}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase ml-1 ${activeConversation.channel === "whatsapp" ? "bg-[#E8F8F0] border-[#A8E6CF] text-[#2E7D32]" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                        {activeConversation.channel}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleMarkResolved}
                      className={activeConversation.status === "resolved" ? "border-green-500 text-green-600" : ""}>
                      {activeConversation.status === "resolved" ? "Re-open" : "Mark Resolved"}
                    </Button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ backgroundColor: '#F1F5F9' }}>
                    {activeConversation.messages.map(msg => {
                      const isMe = msg.sender === "me";
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[68%] space-y-1">
                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"}`}
                              style={{ fontFamily: "Outfit, sans-serif" }}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] text-gray-400 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span>{msg.timestamp}</span>
                              {isMe && (msg.status === "read" ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Composer */}
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => { const i = document.createElement("input"); i.type = "file"; i.click(); }}
                        className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-all flex-shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <div className="relative flex-1">
                        <input type="text" value={composerText} onChange={e => setComposerText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Type a message..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24"
                          style={{ fontFamily: "Outfit, sans-serif" }} />
                        {activeConversation.channel === "whatsapp" && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <button type="button" onClick={() => setShowUseTemplateDropdown(!showUseTemplateDropdown)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              Template
                            </button>
                            {showUseTemplateDropdown && (
                              <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-2.5 bg-gray-50 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Template</span>
                                  <button onClick={() => setShowUseTemplateDropdown(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                                </div>
                                <div className="max-h-52 overflow-y-auto py-1">
                                  {globalTemplates.length === 0
                                    ? <div className="p-4 text-center text-xs text-gray-500">No templates yet.</div>
                                    : globalTemplates.map(t => (
                                      <button key={t.id} onClick={() => { setComposerText(t.bodyText); setShowUseTemplateDropdown(false); }}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex justify-between items-center"
                                        style={{ fontFamily: "Outfit, sans-serif" }}>
                                        <span className="font-medium truncate mr-2">{t.name}</span>
                                        <span className="text-[9px] text-gray-400 shrink-0 font-semibold">{t.category}</span>
                                      </button>
                                    ))
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={handleSendMessage}
                        className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-sm flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#F8FAFC' }}>
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4"><MessageSquare className="w-7 h-7 text-blue-600" /></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Select a conversation</h3>
                  <p className="text-sm text-gray-500 max-w-xs text-center" style={{ fontFamily: "Outfit, sans-serif" }}>Choose a thread from the left to read and reply to messages.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: TEMPLATE BUILDER
        ══════════════════════════════════════════════════════ */}
        {activeTab === "templates" && (
          <div className="flex gap-6 min-h-[calc(100vh-250px)] items-start">
            <div className="w-[320px] bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 shrink-0 max-h-[calc(100vh-250px)] overflow-y-auto">
              <CollapsibleSidebarSection title="Messages" count={globalTemplates.length} addLabel="New" onAddNew={handleCreateNewTemplate}>
                {globalTemplates.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
                    <MessageCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>No templates saved yet.</p>
                  </div>
                ) : globalTemplates.map(tpl => {
                  const isSelected = editingTemplateId === tpl.id;
                  return (
                    <div key={tpl.id} onClick={() => handleEditTemplate(tpl)}
                      className={`p-3.5 border rounded-xl cursor-pointer hover:border-blue-400 transition-all ${isSelected ? "border-blue-600 bg-blue-50/10 shadow-sm" : "border-gray-200 bg-white"}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-sm font-semibold text-gray-900 truncate mr-2" style={{ fontFamily: "DM Sans, sans-serif" }}>{tpl.name}</h4>
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase shrink-0">{tpl.category}</span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 truncate mb-2">{tpl.identifier}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span style={{ fontFamily: "Outfit, sans-serif" }}>{tpl.language}</span>
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); handleEditTemplate(tpl); }} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3 h-3 text-gray-500" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleSidebarSection>

              <CollapsibleSidebarSection title="Campaigns" count={campaigns.length} addLabel="New" onAddNew={() => { setShowCampaignBuilderInTemplates(true); setShowBuilderForm(false); handleOpenCreate(); }}>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3" style={{ fontFamily: "Outfit, sans-serif" }}>No campaigns yet.</p>
                ) : campaigns.map(c => (
                  <div key={c.id} onClick={() => { setShowCampaignBuilderInTemplates(true); setShowBuilderForm(false); handleOpenEdit(c); }}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{c.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
                  </div>
                ))}
              </CollapsibleSidebarSection>
            </div>

            <div className="flex-1 flex gap-6 items-start">
              {showCampaignBuilderInTemplates && showCampaignBuilder ? (
                <CampaignBuilderView
                  campaignForm={campaignForm} setCampaignForm={setCampaignForm}
                  campaignNodes={campaignNodes} setCampaignNodes={setCampaignNodes}
                  editingNodeId={editingNodeId} setEditingNodeId={setEditingNodeId}
                  editingCampaignId={editingCampaignId} globalTemplates={globalTemplates}
                  handleAddNode={handleAddNode} handleSaveCampaign={handleSaveCampaign}
                  onBack={() => { setShowCampaignBuilderInTemplates(false); setShowCampaignBuilder(false); }} />
              ) : showBuilderForm ? (
                <>
                  <form onSubmit={handleSaveTemplate} className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{editingTemplateId ? "Edit Template" : "New WhatsApp Template"}</h3>
                      <button type="button" onClick={() => setShowBuilderForm(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Template Name *</label>
                        <input type="text" required value={templateForm.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Appointment Reminder"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ fontFamily: "Outfit, sans-serif" }} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Template Identifier *</label>
                        <input type="text" required value={templateForm.identifier} onChange={e => setTemplateForm({ ...templateForm, identifier: e.target.value })} placeholder="appointment_reminder"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Category *</label>
                        <Select value={templateForm.category} onValueChange={(val: any) => setTemplateForm({ ...templateForm, category: val })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Utility">Utility</SelectItem><SelectItem value="Authentication">Authentication</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Language *</label>
                        <Select value={templateForm.language} onValueChange={(val: any) => setTemplateForm({ ...templateForm, language: val })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>{LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Body Text *</label>
                        <VariablePickerButton targetRef={textareaRef} value={templateForm.bodyText} onChange={val => setTemplateForm(prev => ({ ...prev, bodyText: val }))} label="{ } Insert Variable" />
                      </div>
                      <textarea ref={textareaRef} required value={templateForm.bodyText} onChange={e => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                        placeholder="Hello {{contact_name}}, your appointment is confirmed for {{appointment_date}}." rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Footer Text (Optional)</label>
                      <input type="text" value={templateForm.footerText} onChange={e => setTemplateForm({ ...templateForm, footerText: e.target.value })} placeholder="e.g. Reply STOP to opt out"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Buttons (Optional)
                        </label>
                        <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {templateForm.buttons.length}/3
                        </span>
                      </div>

                      {templateForm.buttons.map((btn, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-xl bg-gray-50/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Button {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveButton(index)}
                              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={btn.type}
                              onChange={e => handleButtonChange(index, "type", e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
                            >
                              <option value="quick_reply">Quick Reply</option>
                              <option value="call">Call Phone Number</option>
                              <option value="url">Visit Website</option>
                              <option value="template">Attach Template</option>
                            </select>
                            <input
                              type="text"
                              value={btn.label}
                              onChange={e => handleButtonChange(index, "label", e.target.value)}
                              placeholder="Button text..."
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                            />
                          </div>

                          {btn.type === "call" && (
                            <input
                              type="tel"
                              value={btn.value || ""}
                              onChange={e => handleButtonChange(index, "value", e.target.value)}
                              placeholder="+1 555 123 4567"
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                            />
                          )}
                          {btn.type === "url" && (
                            <input
                              type="url"
                              value={btn.value || ""}
                              onChange={e => handleButtonChange(index, "value", e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg font-mono"
                            />
                          )}
                          {btn.type === "template" && (
                            globalTemplates.filter(t => t.identifier !== templateForm.identifier).length === 0 ? (
                              <p className="text-xs text-gray-400 italic px-1 py-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                                No other templates available yet to attach.
                              </p>
                            ) : (
                              <select
                                value={btn.value || ""}
                                onChange={e => handleButtonChange(index, "value", e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
                              >
                                <option value="">Select a template...</option>
                                {globalTemplates
                                  .filter(t => t.identifier !== templateForm.identifier)
                                  .map(t => (
                                    <option key={t.id} value={t.identifier}>{t.name}</option>
                                  ))}
                              </select>
                            )
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddButton}
                        disabled={templateForm.buttons.length >= 3}
                        className="w-full py-2 text-xs font-semibold border border-dashed border-gray-300 text-blue-600 rounded-lg hover:bg-blue-50/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Button
                      </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                      <Button variant="outline" type="button" onClick={() => { setShowBuilderForm(false); setEditingTemplateId(null); }}>Cancel</Button>
                      <Button variant="primary" type="submit">Save Template</Button>
                    </div>
                  </form>
                  <div className="w-[280px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
                    <div className="border-b border-gray-100 pb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</span></div>
                    <div className="rounded-2xl border-4 border-gray-800 overflow-hidden shadow-inner bg-[#E5DDD5] h-[340px] flex flex-col">
                      <div className="bg-[#075E54] text-white p-2.5 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">WA</div>
                        <p className="text-[10px] font-bold">Mantra Health</p>
                      </div>
                      <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end">
                        <div className="bg-white rounded-lg shadow-sm p-2 text-[11px] text-gray-800 max-w-[90%] rounded-tl-none space-y-1 select-none">
                          <p className="whitespace-pre-wrap leading-tight text-gray-700">{templateForm.bodyText || "Template body goes here..."}</p>
                          {templateForm.footerText && <p className="text-[9px] text-gray-400">{templateForm.footerText}</p>}
                        </div>
                        {templateForm.buttons.length > 0 && (
                          <div className="bg-white rounded-b-lg shadow-sm max-w-[90%] mt-0.5 overflow-hidden">
                            {templateForm.buttons.map((btn, i) => (
                              <div
                                key={i}
                                className={`px-3 py-2 text-[10px] font-semibold text-center text-blue-600 flex items-center justify-center gap-1 ${i > 0 ? "border-t border-gray-100" : ""}`}
                              >
                                {btn.type === "template" && <Link2 className="w-3 h-3 shrink-0" />}
                                <span>{btn.label || "Button"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center h-[calc(100vh-250px)] flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4"><FileText className="w-7 h-7 text-blue-600" /></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Select or create a message</h3>
                  <p className="text-sm text-gray-500 max-w-sm text-center mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Pick an existing template or campaign from the left, or create a new one.</p>
                  <Button variant="primary" onClick={handleCreateNewTemplate}><Plus className="w-4 h-4" />Create Message</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: CAMPAIGNS
        ══════════════════════════════════════════════════════ */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>WhatsApp Campaigns</h2>
                <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>Create and track automated marketing flows</p>
              </div>
              <Button variant="primary" onClick={handleNewCampaignFromAnywhere}><Plus className="w-4 h-4" /> New Campaign</Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Campaigns", value: campaigns.length, icon: <Zap className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
                { label: "Active", value: campaigns.filter(c => c.status === "active").length, icon: <Play className="w-5 h-5 text-green-600" />, bg: "bg-green-50" },
                { label: "Total Sent", value: campaigns.reduce((a, c) => a + c.sent, 0).toLocaleString(), icon: <Send className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50" },
                { label: "Avg. Open Rate", value: (() => { const s = campaigns.filter(c => c.sent > 0); return s.length ? Math.round(s.reduce((a, c) => a + c.opened / c.sent, 0) / s.length * 100) + "%" : "—"; })(), icon: <TrendingUp className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50" },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg}`}>{card.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{card.value}</p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>{card.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {campaigns.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4"><Zap className="w-7 h-7 text-blue-600" /></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>No campaigns yet</h3>
                  <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Create your first campaign to start nurturing leads on WhatsApp.</p>
                  <Button variant="primary" onClick={handleNewCampaignFromAnywhere}><Plus className="w-4 h-4" />New Campaign</Button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100" style={{ backgroundColor: '#1F2937' }}>
                      {["Campaign Name", "Status", "Audience", "Sent", "Delivered", "Opened", "Clicked", "Created", "Actions"].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campaigns.map(campaign => (
                      <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3"><p className="text-sm font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{campaign.name}</p></td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_COLOR[campaign.status]}`}>{campaign.status}</span></td>
                        <td className="px-4 py-3"><p className="text-xs text-gray-500 max-w-[160px] truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{campaign.audience}</p></td>
                        {[campaign.sent, campaign.delivered, campaign.opened, campaign.clicked].map((val, i) => (
                          <td key={i} className="px-4 py-3 text-center"><p className="text-sm font-bold text-gray-900">{val.toLocaleString()}</p></td>
                        ))}
                        <td className="px-4 py-3"><p className="text-xs text-gray-400">{campaign.createdAt}</p></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button className="campaign-menu-container p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" onClick={e => handleToggleMenu(campaign.id, e)}>
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: CHATBOT — Process.tsx-style layout
        ══════════════════════════════════════════════════════ */}
        {activeTab === "chatbot" && (
          <div className="flex gap-6 min-h-[calc(100vh-250px)] items-start">

            {/* Left Sidebar — Process-style tab list */}
            <div className="w-[280px] shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Chatbot</h2>
                  {/* Master toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={chatbotEnabled}
                      onChange={e => { setChatbotEnabled(e.target.checked); toast.success(e.target.checked ? "Chatbot enabled" : "Chatbot disabled"); }} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
                  </label>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${chatbotEnabled ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                  <div className={`w-2 h-2 rounded-full ${chatbotEnabled ? "bg-green-500" : "bg-gray-400"}`} />
                  <p className="text-xs font-medium" style={{ color: chatbotEnabled ? '#15803d' : '#6b7280', fontFamily: "Outfit, sans-serif" }}>
                    {chatbotEnabled ? "Active — handling inbound messages" : "Inactive"}
                  </p>
                </div>

                {/* Live preview */}
                <div className="rounded-xl border-2 border-gray-800 overflow-hidden bg-[#E5DDD5]" style={{ height: '260px', display: 'flex', flexDirection: 'column' }}>
                  <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
                    <div><p className="text-xs font-bold leading-none">Mantra Health Bot</p><p className="text-[9px] opacity-75 mt-0.5">{chatbotEnabled ? "● Online" : "○ Offline"}</p></div>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-[10px] text-gray-800 leading-snug">{greetingMessage || "Hello! How can I help?"}</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 text-right">10:00 AM</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5 max-w-[80%]">
                        <p className="text-[10px] text-gray-800 leading-snug">I need to book an appointment</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 text-right">10:01 AM ✓✓</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-[10px] text-gray-800 leading-snug">Sure! Let me help you book that. What date works best?</p>
                        <p className="text-[8px] text-gray-400 mt-0.5 text-right">10:01 AM</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 flex items-center gap-1.5 border-t border-gray-200 flex-shrink-0">
                    <div className="flex-1 bg-gray-100 rounded-full px-2.5 py-1 text-[9px] text-gray-400">Type a message...</div>
                    <div className="w-6 h-6 bg-[#075E54] rounded-full flex items-center justify-center"><Send className="w-3 h-3 text-white" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel — Accordion Settings */}
            <div className="flex-1 space-y-3">

              {/* ── BASIC TAB heading ── */}
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 shadow-sm">
                  {["Basic", "Advanced"].map(tab => (
                    <button key={tab}
                      onClick={() => {/* handled by accordion visibility below */ }}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg text-blue-600 bg-blue-50"
                      style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* ────────── BASIC SETTINGS ────────── */}

              {/* 1. Greeting Message */}
              <AccordionSection
                title="Greeting Message"
                icon={<MessageCircle className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
                defaultOpen={true}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Sent automatically when a contact opens a new conversation.
                </p>
                <textarea rows={3} value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }} />
              </AccordionSection>

              {/* 2. AI Objective / Behaviour (like Caller Pitch) */}
              <AccordionSection
                title="AI Objective & Behaviour"
                icon={<Bot className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
                defaultOpen={false}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Define the AI's role, goals, and how it should respond. This shapes every reply OpenAI generates — think of it as the system prompt for this chatbot.
                </p>
                <textarea rows={6} value={aiObjective} onChange={e => setAiObjective(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
                  placeholder="You are a helpful assistant for [Business]. Your goal is to..."
                  style={{ fontFamily: "Outfit, sans-serif", minHeight: '120px' }} />
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Intent detection is handled automatically by OpenAI — no manual keyword lists needed. The AI interprets context and responds accordingly.
                  </p>
                </div>
              </AccordionSection>

              {/* 3. Business Information */}
              <AccordionSection
                title="Business Information"
                icon={<FileText className="w-5 h-5 text-teal-600" />}
                iconBg="bg-teal-100"
                defaultOpen={false}
                badge={businessInfoItems.filter(i => i.active).length > 0 ? `${businessInfoItems.filter(i => i.active).length} active` : undefined}
                badgeColor="bg-teal-100 text-teal-700"
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Facts the AI should know and use in replies — hours, services, pricing, FAQs.
                </p>
                <div className="space-y-2">
                  {businessInfoItems.map(item => (
                    <div key={item.id} className={`p-3 border rounded-lg bg-white ${item.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          {item.active && <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Active</span>}
                          <button onClick={() => { setEditingBusinessInfoId(item.id); setBusinessInfoFormData({ title: item.title, information: item.information, active: item.active }); setShowBusinessInfoForm(true); }}
                            className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3 h-3 text-gray-500" /></button>
                          <button onClick={() => { setBusinessInfoItems(prev => prev.filter(i => i.id !== item.id)); toast.success("Removed"); }}
                            className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2" style={{ fontFamily: "Outfit, sans-serif" }}>{item.information}</p>
                    </div>
                  ))}
                </div>
                {showBusinessInfoForm && (
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/40 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                      <input type="text" value={businessInfoFormData.title} onChange={e => setBusinessInfoFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Clinic Hours"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Information</label>
                      <textarea rows={2} value={businessInfoFormData.information} onChange={e => setBusinessInfoFormData(p => ({ ...p, information: e.target.value }))} placeholder="Monday to Saturday, 9 AM – 7 PM."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={businessInfoFormData.active} onChange={e => setBusinessInfoFormData(p => ({ ...p, active: e.target.checked }))}
                          className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-xs font-medium text-gray-700">Active</span>
                      </label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setShowBusinessInfoForm(false); setEditingBusinessInfoId(null); setBusinessInfoFormData({ title: "", information: "", active: true }); }}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="button" onClick={() => {
                          if (!businessInfoFormData.title || !businessInfoFormData.information) return;
                          if (editingBusinessInfoId !== null) {
                            setBusinessInfoItems(prev => prev.map(i => i.id === editingBusinessInfoId ? { ...i, ...businessInfoFormData } : i));
                            toast.success("Updated");
                          } else {
                            setBusinessInfoItems(prev => [...prev, { id: Date.now(), ...businessInfoFormData }]);
                            toast.success("Added");
                          }
                          setShowBusinessInfoForm(false); setEditingBusinessInfoId(null); setBusinessInfoFormData({ title: "", information: "", active: true });
                        }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                      </div>
                    </div>
                  </div>
                )}
                {!showBusinessInfoForm && (
                  <button type="button" onClick={() => setShowBusinessInfoForm(true)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Information
                  </button>
                )}
              </AccordionSection>

              {/* 4. Business Hours */}
              <AccordionSection
                title="Business Hours"
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                defaultOpen={false}
                badge={businessHoursEnabled ? "On" : "Off"}
                badgeColor={businessHoursEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Restrict chatbot to business hours</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={businessHoursEnabled} onChange={e => setBusinessHoursEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {businessHoursEnabled && (
                  <>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-800 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Mon–Sat, 9 AM – 7 PM · Configure exact hours in <span className="underline cursor-pointer">Settings → Business Hours</span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>After-hours Offline Message</label>
                      <textarea rows={2} value={offlineMessage} onChange={e => setOfflineMessage(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                        style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Responsible Person <span className="text-gray-400 font-normal text-xs ml-1">— handles after-hours enquiries</span>
                      </label>
                      <select value={afterHoursPersonId} onChange={e => setAfterHoursPersonId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                        <option value="">Select team member...</option>
                        {AVAILABLE_EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </AccordionSection>

              {/* 5. Human Handoff */}
              <AccordionSection
                title="Human Handoff"
                icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-100"
                defaultOpen={false}
                badge={handoffEnabled ? "On" : "Off"}
                badgeColor={handoffEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Enable handoff to a human agent</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={handoffEnabled} onChange={e => setHandoffEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {handoffEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>Trigger Keyword</label>
                      <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>When a contact sends this word, the conversation is flagged for a human.</p>
                      <input type="text" value={handoffKeyword} onChange={e => setHandoffKeyword(e.target.value)}
                        placeholder="e.g. human, agent, support" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Responsible Person <span className="text-gray-400 font-normal text-xs ml-1">— assigned when handoff is triggered</span>
                      </label>
                      <select value={handoffPersonId} onChange={e => setHandoffPersonId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                        <option value="">Select team member...</option>
                        {AVAILABLE_EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </AccordionSection>

              {/* 6. Appointment Booking */}
              <AccordionSection
                title="Appointment Booking"
                icon={<Calendar className="w-5 h-5 text-rose-600" />}
                iconBg="bg-rose-100"
                defaultOpen={false}
                badge={appointmentBookingEnabled ? "On" : "Off"}
                badgeColor={appointmentBookingEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>Enable booking via chatbot</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={appointmentBookingEnabled} onChange={e => setAppointmentBookingEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {appointmentBookingEnabled && (
                  <>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        When the AI detects booking intent, it triggers the selected campaign flow. Create booking campaigns in the <span className="font-semibold">Template Builder</span> tab.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Booking Campaign / Flow</label>
                      <select value={appointmentCampaignId} onChange={e => setAppointmentCampaignId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                        <option value="">Select campaign...</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Responsible Person <span className="text-gray-400 font-normal text-xs ml-1">— confirms bookings</span>
                      </label>
                      <select value={appointmentPersonId} onChange={e => setAppointmentPersonId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                        <option value="">Select team member...</option>
                        {AVAILABLE_EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </AccordionSection>

              {/* ────────── ADVANCED SETTINGS ────────── */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: "Outfit, sans-serif" }}>Advanced</p>
              </div>

              {/* 7. Escalation Rules */}
              <AccordionSection
                title="Escalation Rules"
                icon={<Shield className="w-5 h-5 text-orange-600" />}
                iconBg="bg-orange-100"
                defaultOpen={false}
                badge={escalationRules.filter(r => r.enabled).length > 0 ? `${escalationRules.filter(r => r.enabled).length} rules` : undefined}
                badgeColor="bg-orange-100 text-orange-700"
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Hard overrides — when these keywords appear, always route to a specific person instead of letting the AI improvise. These take priority over the AI's own responses.
                </p>
                <div className="space-y-2">
                  {escalationRules.map(rule => {
                    const person = AVAILABLE_EMPLOYEES.find(e => e.id === rule.responsiblePersonId);
                    return (
                      <div key={rule.id} className={`flex items-center justify-between p-3 border rounded-lg bg-white ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-mono">{rule.keyword}</span>
                            {!rule.enabled && <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Disabled</span>}
                          </div>
                          <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>→ {person?.name || "Unassigned"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={rule.enabled}
                              onChange={() => setEscalationRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))} />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                          </label>
                          <button onClick={() => { setEditingEscalationId(rule.id); setEscalationForm({ keyword: rule.keyword, responsiblePersonId: rule.responsiblePersonId }); setShowEscalationForm(true); }}
                            className="p-1.5 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => { setEscalationRules(prev => prev.filter(r => r.id !== rule.id)); toast.success("Rule removed"); }}
                            className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {showEscalationForm && (
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/40 space-y-3">
                    <h4 className="text-sm font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>{editingEscalationId ? "Edit Rule" : "New Escalation Rule"}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Trigger Keyword</label>
                        <input type="text" value={escalationForm.keyword} onChange={e => setEscalationForm(p => ({ ...p, keyword: e.target.value }))} placeholder="cancel subscription"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" style={{ fontFamily: "Outfit, sans-serif" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Route To</label>
                        <select value={escalationForm.responsiblePersonId} onChange={e => setEscalationForm(p => ({ ...p, responsiblePersonId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                          <option value="">Select person...</option>
                          {AVAILABLE_EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setShowEscalationForm(false); setEditingEscalationId(null); setEscalationForm({ keyword: "", responsiblePersonId: "" }); }}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={handleSaveEscalation}>Save Rule</Button>
                    </div>
                  </div>
                )}
                {!showEscalationForm && (
                  <button type="button" onClick={() => { setEditingEscalationId(null); setEscalationForm({ keyword: "", responsiblePersonId: "" }); setShowEscalationForm(true); }}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Escalation Rule
                  </button>
                )}
              </AccordionSection>

              {/* 8. Fallback Message */}
              <AccordionSection
                title="Fallback Message"
                icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
                iconBg="bg-yellow-100"
                defaultOpen={false}
              >
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Sent when OpenAI cannot generate a confident or appropriate response. Use this as a safety net.
                </p>
                <textarea rows={3} value={fallbackMessage} onChange={e => setFallbackMessage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }} />
              </AccordionSection>

              {/* 9. AI Model & Response Style */}
              <AccordionSection
                title="AI Model & Response Style"
                icon={<Settings className="w-5 h-5 text-gray-600" />}
                iconBg="bg-gray-100"
                defaultOpen={false}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Model Tier</label>
                    <select value={aiModelTier} onChange={e => setAiModelTier(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                      <option value="Express">Express — Fast, lightweight</option>
                      <option value="Balanced">Balanced — Smart & swift</option>
                      <option value="Smartest">Smartest — Deep reasoning</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Response Style</label>
                    <select value={aiVoiceStyle} onChange={e => setAiVoiceStyle(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: "Outfit, sans-serif", color: '#020817' }}>
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly & Warm</option>
                      <option value="Concise">Concise</option>
                      <option value="Empathetic">Empathetic</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Model selection affects response quality and cost. Balanced is recommended for most healthcare chatbots. Style is injected as a tone instruction into each request.
                  </p>
                </div>
              </AccordionSection>

              {/* Save Button */}
              <div className="pt-2 pb-6">
                <Button variant="primary" className="w-full" onClick={() => toast.success("Chatbot settings saved")}>
                  Save All Settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Row Actions Menu */}
      {openMenuCampaignId && menuPos && createPortal(
        (() => {
          const campaign = campaigns.find(c => c.id === openMenuCampaignId);
          if (!campaign) return null;
          return (
            <div className="campaign-menu-portal fixed w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
              <button onClick={() => handleOpenView(campaign)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Eye className="w-4 h-4" />View Overview
              </button>
              <button onClick={() => { setOpenMenuCampaignId(null); setShowCampaignBuilderInTemplates(true); setShowBuilderForm(false); handleOpenEdit(campaign); handleTabChange("templates"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Pencil className="w-4 h-4" />Edit Campaign
              </button>
              {(campaign.status === "active" || campaign.status === "paused") && (
                <button onClick={() => { handleToggleCampaign(campaign.id); setOpenMenuCampaignId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {campaign.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {campaign.status === "active" ? "Pause" : "Resume"}
                </button>
              )}
              {campaign.status === "draft" && (
                <button onClick={() => { setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: "active" } : c)); toast.success("Campaign launched!"); setOpenMenuCampaignId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Play className="w-4 h-4" />Launch
                </button>
              )}
              <button onClick={() => { handleDeleteCampaign(campaign.id); setOpenMenuCampaignId(null); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          );
        })(),
        document.body
      )}

      {/* Campaign View Drawer */}
      {viewDrawerOpen && viewingCampaign && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setViewDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl" style={{ width: '560px' }}>
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{viewingCampaign.name}</h2>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${STATUS_COLOR[viewingCampaign.status]}`}>{viewingCampaign.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Audience: {viewingCampaign.audience} · Created {viewingCampaign.createdAt}</p>
              </div>
              <button onClick={() => setViewDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4 text-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Sent", value: viewingCampaign.sent, icon: <Send className="w-4 h-4 text-blue-600" />, bg: "bg-blue-50" },
                  { label: "Delivered", value: viewingCampaign.delivered, icon: <CheckCheck className="w-4 h-4 text-green-600" />, bg: "bg-green-50" },
                  { label: "Opened", value: viewingCampaign.opened, icon: <Eye className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50" },
                  { label: "Clicked", value: viewingCampaign.clicked, icon: <MousePointer className="w-4 h-4 text-orange-600" />, bg: "bg-orange-50" },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}>{stat.icon}</div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{stat.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3" style={{ fontFamily: "DM Sans, sans-serif" }}>Campaign Flow</h3>
                <div className="space-y-0">
                  {viewingCampaign.nodes.map((node, idx) => (
                    <div key={node.id}>
                      <div className={`flex items-start gap-3 p-3.5 border-2 rounded-xl ${NODE_TYPE_COLOR[node.type]}`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white shrink-0">{NODE_TYPE_ICON[node.type]}</div>
                        <div>
                          <p className="text-sm font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>{node.label}</p>
                          {node.type === "message" && node.content && <p className="text-[11px] opacity-75 mt-0.5 line-clamp-2" style={{ fontFamily: "Outfit, sans-serif" }}>{node.content}</p>}
                          {node.type === "delay" && node.delayValue && <p className="text-[11px] opacity-75 mt-0.5">Wait {node.delayValue} {node.delayUnit}</p>}
                        </div>
                      </div>
                      {idx < viewingCampaign.nodes.length - 1 && (
                        <div className="flex flex-col items-center py-1">
                          <div className="w-px h-3 bg-gray-300" />
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <button onClick={() => setViewDrawerOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>Close</button>
              <Button variant="primary" size="sm" onClick={() => { setViewDrawerOpen(false); setShowCampaignBuilderInTemplates(true); setShowBuilderForm(false); handleOpenEdit(viewingCampaign); handleTabChange("templates"); }}>
                <Pencil className="w-4 h-4" />Edit Campaign
              </Button>
            </div>
          </div>
        </>
      )}

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Chats Works"
        summary="Chats is your messaging hub. Respond to inbound WhatsApp and SMS messages, build reusable templates, run broadcast campaigns, and automate replies with the chatbot."
        bullets={[
          "Reply to WhatsApp and SMS conversations from one inbox",
          "Build message templates with variables for personalisation",
          "Create broadcast campaigns to reach multiple contacts",
          "Set up chatbot flows with keyword triggers and escalation rules",
        ]}
      />
    </div>
  );
}