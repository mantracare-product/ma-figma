import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import VariablePickerButton from "../components/process/VariablePickerButton";
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
  ShieldCheck,
  Calendar,
  AlertTriangle,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Hash,
  FlaskConical,
  Share2,
  Copy,
  Upload,
  LibraryBig,
} from "lucide-react";
import TemplateLibraryDrawer from "../components/chats/TemplateLibraryDrawer";
import { LibraryTemplate } from "../../lib/templateLibrary";
import { useWhatsappTemplates } from "../../lib/useWhatsappTemplates";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import AssignChatbotModal from "../components/chats/AssignChatbotModal";
import EnrollCampaignModal from "../components/chats/EnrollCampaignModal";
import CampaignShareModal from "../components/chats/CampaignShareModal";
import { getClientList } from "../../lib/getClientList";
import TestAsContactDrawer from "../components/chats/TestAsContactDrawer";
import RequestTemplateApprovalModal from "../components/chats/RequestTemplateApprovalModal";
import { Bot as BotType } from "../components/chats/ChatbotTab";
import {
  advanceCampaignStep,
  activateBotOnConversation,
  ConversationShape,
  buildTemplateMessage,
} from "../../lib/conversationBotRuntime";
import { resolveTestVariables } from "../../lib/chatbotTestReply";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import ChatbotTab from "../components/chats/ChatbotTab";
import InboxNavSidebar from "../components/chats/InboxNavSidebar";
import { CHANNEL_LABELS, CHANNEL_CLASSES } from "../../constants/channels";
import { getStoredWhatsAppNumbers, DEFAULT_MOCK_NUMBERS } from "../../lib/useWhatsAppNumbers";

// ─── Type Definitions ────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "contact" | "me";
  status?: "sent" | "delivered" | "read";
  origin?: "human" | "bot" | "campaign" | "template" | "system";
  buttons?: Array<{ label: string; nextNodeId: string | null; actionType?: string; actionValue?: string }>;
  header?: {
    type?: "none" | "text" | "image" | "video" | "document";
    text?: string;
    mediaUrl?: string;
    fileName?: string;
  };
}

interface Conversation {
  id: string;
  contactName: string;
  phoneNumber: string;
  inboxNumber?: string;
  channel: "whatsapp" | "sms" | "website";
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "open" | "resolved";
  messages: Message[];
  botStatus?: "active" | "paused" | "off";
  assignedPersonId?: string;
  assignedBotId?: string;
  botRuntime?: {
    currentNodeId: string | null;
    awaitingFreeText: boolean;
    pendingHandoffNodeId: string | null;
  };
  campaignEnrollments?: Array<{
    campaignId: string;
    currentNodeIndex: number;
    enrolledAt: string;
    status: "active" | "completed" | "paused";
    nextRunAt?: string;
  }>;
}

export interface WhatsappTemplate {
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
  // Standalone header fields (preferred over legacy `header` object)
  headerType?: "none" | "text" | "image" | "video" | "document";
  headerText?: string;
  headerMediaUrl?: string;
  headerFileName?: string;
  /** Maps each {{variable}} token in bodyText to a data source */
  variableMappings?: Record<string, {
    source: "static" | "field" | "availability";
    staticValue?: string;
    fieldKey?: string;
  }>;
  // Approval workflow
  approvalStatus?: "pending" | "approved" | "denied";
  metaTemplateId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface CampaignNode {
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
  messageMode?: "text" | "template" | "chatbot";
  targetBotId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  audience: string;
  audienceName?: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  createdAt: string;
  nodes: CampaignNode[];
  audienceClientIds?: string[];
  audienceManualRecipients?: { name?: string; phone: string }[];
}



export type EscalationMatchType = "contains" | "exact" | "starts_with";

export interface TemplateRule {
  id: string;
  triggerKeyword: string;
  matchType: EscalationMatchType;
  templateId: string;
  enabled: boolean;
}

export interface EscalationRule {
  id: string;
  keyword: string;
  matchType: EscalationMatchType;
  responsiblePersonId: string;
  enabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin", "Arabic", "Portuguese", "Russian", "Japanese"];


const CURRENT_USER_ID = "1";

const AVAILABLE_EMPLOYEES = [
  { id: "1", name: "Sarah Johnson" },
  { id: "2", name: "Michael Chen" },
  { id: "3", name: "Emily Rodriguez" },
  { id: "4", name: "James Wilson" },
  { id: "5", name: "Lisa Thompson" },
];

const INITIAL_MOCK_CONVERSATIONS: Conversation[] = [
  // Number 1: +1 (555) 123-4567
  {
    id: "conv-1",
    contactName: "Sarah Jenkins",
    phoneNumber: "+1 (555) 234-5678",
    inboxNumber: "+1 (555) 123-4567",
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
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-2",
    contactName: "Michael Chang",
    phoneNumber: "+1 (555) 876-5432",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Thanks for the update!",
    timestamp: "Yesterday",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-2-1", text: "Hi, has my lab report come back yet?", timestamp: "Yesterday, 2:00 PM", sender: "contact" },
      { id: "msg-2-2", text: "Yes! Everything looks normal, we'll email the full report shortly.", timestamp: "Yesterday, 2:10 PM", sender: "me", status: "read" },
      { id: "msg-2-3", text: "Thanks for the update!", timestamp: "Yesterday, 2:12 PM", sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  // Number 2: +1 (555) 987-6543
  {
    id: "conv-3",
    contactName: "Elena Rostova",
    phoneNumber: "+1 (555) 345-6789",
    inboxNumber: "+1 (555) 987-6543",
    channel: "whatsapp",
    lastMessage: "Awesome service! Thanks for checking in.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-3-1", text: "Hello Elena, how is your recovery progressing?", timestamp: "Yesterday, 11:00 AM", sender: "me", status: "read" },
      { id: "msg-3-2", text: "Awesome service! Thanks for checking in.", timestamp: "Yesterday, 11:15 AM", sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-4",
    contactName: "Priya Nair",
    phoneNumber: "+1 (555) 345-8901",
    inboxNumber: "+1 (555) 987-6543",
    channel: "whatsapp",
    lastMessage: "Sounds good, thank you!",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-4-1", text: "Do you have any openings this Friday?", timestamp: "3 days ago", sender: "contact" },
      { id: "msg-4-2", text: "Yes, we have a 11:00 AM slot open.", timestamp: "3 days ago", sender: "me", status: "read" },
      { id: "msg-4-3", text: "Sounds good, thank you!", timestamp: "3 days ago", sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  // SMS channel conversation
  {
    id: "conv-5",
    contactName: "David Miller",
    phoneNumber: "+1 (555) 432-1000",
    inboxNumber: "+1 (555) 432-1000",
    channel: "sms",
    lastMessage: "Thanks, I will confirm by tonight.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-5-1", text: "Hi David, your lab reports have been received.", timestamp: "Yesterday, 4:15 PM", sender: "me", status: "read" },
      { id: "msg-5-2", text: "Thanks, I will confirm by tonight.", timestamp: "Yesterday, 4:20 PM", sender: "contact" },
    ],
    botStatus: "paused",
    assignedPersonId: "1",
  },
  // Website channel conversation
  {
    id: "conv-6",
    contactName: "Alex Rivera",
    phoneNumber: "Website Visitor",
    channel: "website",
    lastMessage: "Do you accept walk-ins?",
    timestamp: "2 hours ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-6-1", text: "Hi! How can I help you today?", timestamp: "2 hours ago", sender: "me", status: "read" },
      { id: "msg-6-2", text: "Do you accept walk-ins?", timestamp: "2 hours ago", sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
];

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp-1",
    name: "Post-Visit Follow-up",
    status: "active",
    audience: "Patients visited in last 7 days",
    audienceName: "Post-Visit Patients",
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
    audienceName: "Scheduled Patients",
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
    audienceName: "New Leads List",
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

export interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
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
}) => {
  const nodeTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const conditionValueRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [availableBots, setAvailableBots] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chatbotBots");
      if (raw) {
        const sanitizeBot = (b: any) => ({ ...b, channels: (b.channels || []).filter((c: string) => c !== "sms") });
        setAvailableBots(JSON.parse(raw).map(sanitizeBot));
      }
    } catch { }
  }, []);

  return (
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
          {campaignNodes.map((node, idx) => {
            const isSelected = editingNodeId === node.id;
            return (
              <div key={node.id}>
                <div className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${isSelected ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-300"} ${node.type === "end" ? "opacity-60" : ""}`}
                  onClick={() => node.type !== "end" && setEditingNodeId(editingNodeId === node.id ? null : node.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${NODE_TYPE_COLOR[node.type]}`}>{NODE_TYPE_ICON[node.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{node.label}</p>
                      {node.type === "message" && (
                        <p className="text-xs text-gray-500 truncate mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {node.messageMode === "template"
                            ? `Template: ${globalTemplates.find(t => t.identifier === node.templateIdentifier || t.id === node.templateIdentifier)?.name || node.templateIdentifier || "—"}`
                            : node.messageMode === "chatbot"
                              ? `Chatbot: ${availableBots.find(b => b.id === node.targetBotId)?.name || "—"}`
                              : node.content || "—"}
                        </p>
                      )}
                      {node.type === "delay" && node.delayValue && (
                        <p className="text-xs text-yellow-600 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>Wait {node.delayValue} {node.delayUnit}</p>
                      )}
                      {node.type === "condition" && (
                        <p className="text-xs text-purple-650 font-semibold truncate mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                          If {node.conditionField || "name"} {node.conditionOp || "equals"} {node.conditionOp !== "is_empty" ? `"${node.conditionValue || ""}"` : ""}
                        </p>
                      )}
                    </div>
                    {node.type !== "end" && (
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" onClick={e => { e.stopPropagation(); setCampaignNodes(prev => prev.filter(n => n.id !== node.id)); if (editingNodeId === node.id) setEditingNodeId(null); toast.success("Step removed"); }}>
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
            );
          })}
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

      <div className="w-[360px] shrink-0 space-y-4">
        {editingNodeId && (() => {
          const node = campaignNodes.find(n => n.id === editingNodeId);
          if (!node) return null;
          const updateNode = (patch: Partial<CampaignNode>) => {
            setCampaignNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, ...patch } : n));
          };
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${NODE_TYPE_COLOR[node.type]}`}>{NODE_TYPE_ICON[node.type]}</div>
                  <span className="text-sm font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>Configure Step</span>
                </div>
                <button onClick={() => setEditingNodeId(null)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* MESSAGE NODE */}
                {node.type === "message" && (
                  <>
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                      {(["text", "template", "chatbot"] as const).map(m => (
                        <button key={m} type="button" onClick={() => updateNode({ messageMode: m })}
                          className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all capitalize cursor-pointer ${(node.messageMode ?? "text") === m ? "bg-white shadow text-blue-600 font-bold" : "text-gray-500 hover:text-gray-700"
                            }`}>
                          {m === "text" ? "Message" : m === "template" ? "Template" : "Chatbot"}
                        </button>
                      ))}
                    </div>

                    {(node.messageMode ?? "text") === "text" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Message Content</label>
                          <VariablePickerButton
                            targetRef={{ current: nodeTextareaRefs.current[node.id] }}
                            value={node.content || ""}
                            onChange={v => updateNode({ content: v })}
                            label="{ } Insert Variable"
                          />
                        </div>
                        <textarea
                          ref={el => { nodeTextareaRefs.current[node.id] = el; }}
                          rows={4}
                          value={node.content || ""}
                          onChange={e => updateNode({ content: e.target.value })}
                          placeholder="Type message..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 resize-none text-gray-700 bg-white"
                        />
                      </div>
                    )}

                    {node.messageMode === "template" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp Template</label>
                        <select
                          value={node.templateIdentifier || ""}
                          onChange={e => updateNode({ templateIdentifier: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-750">
                          <option value="">Select template…</option>
                          {globalTemplates.filter(t => !t.approvalStatus || t.approvalStatus === "approved").length === 0 && (
                            <option disabled value="">No approved templates yet</option>
                          )}
                          {globalTemplates.filter(t => !t.approvalStatus || t.approvalStatus === "approved").map(t => (
                            <option key={t.id} value={t.identifier || t.id}>{t.name} ({t.category})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {node.messageMode === "chatbot" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Chatbot</label>
                        <select
                          value={node.targetBotId || ""}
                          onChange={e => updateNode({ targetBotId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-755">
                          <option value="">Select chatbot…</option>
                          {availableBots.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* DELAY NODE */}
                {node.type === "delay" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</label>
                      <input type="number" min={1} value={node.delayValue ?? 1}
                        onChange={e => updateNode({ delayValue: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</label>
                      <select value={node.delayUnit || "days"}
                        onChange={e => updateNode({ delayUnit: e.target.value as "minutes" | "hours" | "days" })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-750">
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* CONDITION NODE */}
                {node.type === "condition" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Variable</label>
                      <select value={node.conditionField || "name"}
                        onChange={e => updateNode({ conditionField: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-750">
                        <option value="name">Client Name</option>
                        <option value="email">Client Email</option>
                        <option value="phone">Client Phone</option>
                        <option value="status">Client Status</option>
                        <option value="country">Country</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operator</label>
                      <select value={node.conditionOp || "equals"}
                        onChange={e => updateNode({ conditionOp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-750">
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="starts_with">Starts With</option>
                        <option value="ends_with">Ends With</option>
                        <option value="is_empty">Is Empty</option>
                      </select>
                    </div>
                    {node.conditionOp !== "is_empty" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Value</label>
                          <VariablePickerButton
                            targetRef={{ current: conditionValueRefs.current[node.id] }}
                            value={node.conditionValue || ""}
                            onChange={v => updateNode({ conditionValue: v })}
                            label="{ } Insert Variable"
                            mode="insert"
                          />
                        </div>
                        <input
                          ref={el => { conditionValueRefs.current[node.id] = el; }}
                          type="text"
                          value={node.conditionValue || ""}
                          onChange={e => updateNode({ conditionValue: e.target.value })}
                          placeholder="Match value..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

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
};

// Legacy chatbot/campaign-automation module — superseded by Process Settings automation.
// Flip to true to restore the old chatbot-driven UI without touching any other code.
const LEGACY_CHATBOT_MODULE_ENABLED = false;

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
    else if (tabParam === "chatbot" && LEGACY_CHATBOT_MODULE_ENABLED) setActiveTab("chatbot");
    else setActiveTab("chats");
  }, [location.search]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    navigate(`/chats?tab=${tab}`, { replace: true });
  };

  // ── Chats State ──
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const validNumbers = new Set(DEFAULT_MOCK_NUMBERS.map((n) => n.displayPhoneNumber));
    try {
      const stored = localStorage.getItem("whatsappMockConversations");
      if (stored) {
        const parsed: Conversation[] = JSON.parse(stored);
        const updated = parsed.map((c) => {
          if (c.channel === "whatsapp" && (!c.inboxNumber || !validNumbers.has(c.inboxNumber))) {
            return { ...c, inboxNumber: DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber };
          }
          return c;
        });

        const hasNum1Open = updated.some(
          (c) => c.channel === "whatsapp" && c.inboxNumber === DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber && c.status === "open"
        );
        const hasNum2Open = updated.some(
          (c) => c.channel === "whatsapp" && c.inboxNumber === DEFAULT_MOCK_NUMBERS[1]?.displayPhoneNumber && c.status === "open"
        );

        if (hasNum1Open && hasNum2Open) {
          return updated;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MOCK_CONVERSATIONS;
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string>("conv-1");
  const [chatSearch, setChatSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "sms" | "website" | null>("whatsapp");
  const [numberFilter, setNumberFilter] = useState<string>("all");

  useEffect(() => {
    setNumberFilter("all");
  }, [channelFilter]);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "active" | "draft" | "completed">("all");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<"all" | "Marketing" | "Utility" | "Authentication">("all");
  const [chatbotStatusFilter, setChatbotStatusFilter] = useState<"all" | "active" | "inactive">("all");
  type ViewFilter = "all" | "open" | "resolved" | "unread" | "assigned_to_me";
  const [viewFilter, setViewFilter] = useState<ViewFilter>("open");
  const [showViewFilterDropdown, setShowViewFilterDropdown] = useState(false);
  const [showNumberFilterDropdown, setShowNumberFilterDropdown] = useState(false);
  const [isListPaneCollapsed, setIsListPaneCollapsed] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [showUseTemplateDropdown, setShowUseTemplateDropdown] = useState(false);
  const [showComposerGearMenu, setShowComposerGearMenu] = useState(false);
  const [assignAgentMenuOpen, setAssignAgentMenuOpen] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const [showAssignBotModal, setShowAssignBotModal] = useState(false);
  const [showEnrollCampaignModal, setShowEnrollCampaignModal] = useState(false);
  const [showTestContactDrawer, setShowTestContactDrawer] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowComposerGearMenu(false);
        setShowUseTemplateDropdown(false);
        setAssignAgentMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setShowComposerGearMenu(false);
        setAssignAgentMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Campaign State ──
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const stored = localStorage.getItem("whatsappCampaigns");
    return stored ? JSON.parse(stored) : MOCK_CAMPAIGNS;
  });

  useEffect(() => {
    localStorage.setItem("whatsappCampaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => { localStorage.setItem("whatsappMockConversations", JSON.stringify(conversations)); }, [conversations]);

  // Handle navigation state (channel, threadId, clientId, emailId)
  useEffect(() => {
    const state = location.state as {
      clientId?: string;
      channel?: "whatsapp" | "sms" | "website" | "email" | "all";
      threadId?: string;
      emailId?: string;
      messageId?: string;
    } | null;

    if (state?.channel) {
      if (state.channel === "whatsapp" || state.channel === "sms" || state.channel === "website") {
        setChannelFilter(state.channel);
      } else {
        setChannelFilter("all");
      }
    }

    if (state?.threadId || state?.emailId || state?.messageId || state?.clientId) {
      const targetId = state.threadId || state.emailId || state.messageId;
      const found = conversations.find(
        (c) =>
          (targetId && c.id === targetId) ||
          (state.clientId && (c as any).clientId === state.clientId)
      );
      if (found) {
        setSelectedConversationId(found.id);
      }
    }
  }, [location.state, conversations]);

  const activeConversation = conversations.find(c => c.id === selectedConversationId);

  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0) {
      setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedConversationId]);

  // ── Campaign Delay Scheduler Interval Loop ──
  useEffect(() => {
    const timer = setInterval(() => {
      setConversations((prev) => {
        let changed = false;
        const now = Date.now();

        const updated = prev.map((c) => {
          if (!c.campaignEnrollments || c.campaignEnrollments.length === 0) return c;
          if (c.assignedPersonId) return c; // Pause campaign execution while human assigned

          let convoChanged = false;
          let newMsgs = [...c.messages];
          let newEnrollments = c.campaignEnrollments.map((e) => {
            if (e.status !== "active" || !e.nextRunAt) return e;
            if (new Date(e.nextRunAt).getTime() <= now) {
              convoChanged = true;
              const camp = campaigns.find((cmp) => cmp.id === e.campaignId);
              if (camp) {
                const stepRes = advanceCampaignStep(c, camp, e.currentNodeIndex);
                stepRes.newMessages.forEach((m) => {
                  newMsgs.push({
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    text: m.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    sender: m.sender,
                    origin: m.origin || "campaign",
                  });
                });
                return stepRes.enrollmentPatch;
              }
            }
            return e;
          });

          if (convoChanged) {
            changed = true;
            const lastText = newMsgs[newMsgs.length - 1]?.text || c.lastMessage;
            return {
              ...c,
              messages: newMsgs,
              lastMessage: lastText,
              timestamp: "Just now",
              campaignEnrollments: newEnrollments,
            };
          }
          return c;
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [campaigns]);

  const handleMarkResolved = () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === "open" ? "resolved" : "open";
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, status: newStatus } : c));
    toast.success(`Conversation marked as ${newStatus}`);
  };

  const handleToggleBotStatus = () => {
    if (!activeConversation) return;
    const current = activeConversation.botStatus ?? "off";
    const nextStatus = current === "active" ? "paused" : "active";
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, botStatus: nextStatus } : c));
    toast.success(`Bot is now ${nextStatus}`);
  };

  const handleAssignBot = (bot: BotType) => {
    if (!activeConversation) return;
    const advanceRes = activateBotOnConversation(bot, activeConversation);
    const botMsgs: Message[] = advanceRes.newMessages.map((m) => ({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: m.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: m.sender,
      origin: m.origin || "bot",
      buttons: m.buttons,
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? {
            ...c,
            assignedBotId: bot.id,
            botStatus: "active",
            assignedPersonId: "", // Clear human assignment on bot activation
            messages: [...c.messages, ...botMsgs],
            lastMessage: botMsgs.length > 0 ? botMsgs[botMsgs.length - 1].text : c.lastMessage,
            timestamp: "Just now",
            botRuntime: advanceRes.botRuntimePatch || {
              currentNodeId: null,
              awaitingFreeText: false,
              pendingHandoffNodeId: null,
            },
          }
          : c
      )
    );
    toast.success(`Assigned chatbot "${bot.name}"`);
  };

  const handleEnrollCampaign = (campaign: Campaign) => {
    if (!activeConversation) return;
    const stepRes = advanceCampaignStep(activeConversation, campaign, 0);
    const campMsgs: Message[] = stepRes.newMessages.map((m) => ({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: m.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: m.sender,
      origin: m.origin || "campaign",
    }));

    const existingEnrollments = activeConversation.campaignEnrollments || [];
    const filteredEnrollments = existingEnrollments.filter((e) => e.campaignId !== campaign.id);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? {
            ...c,
            messages: [...c.messages, ...campMsgs],
            lastMessage: campMsgs.length > 0 ? campMsgs[campMsgs.length - 1].text : c.lastMessage,
            timestamp: "Just now",
            campaignEnrollments: [...filteredEnrollments, stepRes.enrollmentPatch],
          }
          : c
      )
    );
    toast.success(`Enrolled contact in campaign "${campaign.name}"`);
  };

  const handleSendTemplateDirectly = (template: WhatsappTemplate) => {
    if (!activeConversation) return;
    const resolvedText = resolveTestVariables(template.bodyText || "");
    const built = buildTemplateMessage(template, resolvedText);
    const templateMsg: Message = {
      id: `msg-${Date.now()}`,
      text: built.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      origin: "template",
      status: "read",
      buttons: built.buttons,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? {
            ...c,
            lastMessage: resolvedText,
            timestamp: "Just now",
            messages: [...c.messages, templateMsg],
          }
          : c
      )
    );
    toast.success(`Template "${template.name}" sent`);
  };

  const handleSendMessage = () => {
    if (!composerText.trim() || !activeConversation) return;
    const newMessage: Message = { id: `msg-${Date.now()}`, text: composerText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sender: "me", status: "read" };
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, lastMessage: composerText, timestamp: "Just now", messages: [...c.messages, newMessage] } : c));
    setComposerText("");
    toast.success("Message sent");
  };

  const availableNumbersForChannel = useMemo(() => {
    if (channelFilter === "whatsapp") {
      const stored = getStoredWhatsAppNumbers().map((n) => n.displayPhoneNumber);
      const convNumbers = conversations.filter((c) => c.channel === "whatsapp" && c.inboxNumber).map((c) => c.inboxNumber!);
      return Array.from(new Set([...stored, ...convNumbers]));
    }
    if (channelFilter === "sms") {
      return Array.from(new Set(conversations.filter((c) => c.channel === "sms" && c.inboxNumber).map((c) => c.inboxNumber!)));
    }
    return [];
  }, [channelFilter, conversations]);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) || c.phoneNumber.includes(chatSearch) || c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
    const matchesChannel = channelFilter === null ? false : channelFilter === "all" ? true : c.channel === channelFilter;
    const matchesView =
      viewFilter === "all" ? true :
        viewFilter === "unread" ? c.unreadCount > 0 :
          viewFilter === "assigned_to_me" ? c.assignedPersonId === CURRENT_USER_ID :
            c.status === viewFilter;
    const matchesNumber = numberFilter === "all" ? true : c.inboxNumber === numberFilter;
    return matchesSearch && matchesChannel && matchesView && matchesNumber;
  });

  // ── Templates State ──
  const [globalTemplates, setGlobalTemplates] = useWhatsappTemplates();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templatesView, setTemplatesView] = useState<"table" | "builder">("table");
  const [showVarMapping, setShowVarMapping] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [templateForm, setTemplateForm] = useState<Omit<WhatsappTemplate, "id" | "createdAt">>({
    name: "", identifier: "", category: "Marketing", language: "English",
    header: { type: "none", content: "" }, bodyText: "", footerText: "", buttons: [], variableMappings: {},
    headerType: "none", headerText: "", headerMediaUrl: "", headerFileName: "",
  });

  const handleUseLibraryTemplate = (tpl: LibraryTemplate) => {
    setShowTemplateLibrary(false);
    const newId = `tpl-${Date.now()}`;
    const sanitizedIdentifier = tpl.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    const identifier = `${sanitizedIdentifier}_copy`;

    const newTemplate: WhatsappTemplate = {
      id: newId,
      name: `${tpl.name} (Copy)`,
      identifier,
      category: tpl.category,
      language: tpl.language || "English",
      header: {
        type: tpl.headerType === "image" ? "image" : tpl.headerText ? "text" : "none",
        content: tpl.headerText || ""
      },
      headerType: tpl.headerType || "none",
      headerText: tpl.headerText || "",
      bodyText: tpl.bodyText,
      footerText: tpl.footerText || "",
      buttons: tpl.buttons || [],
      variableMappings: tpl.variableMappings || {},
      createdAt: new Date().toISOString(),
      // Library templates are pre-vetted — mark approved immediately so they
      // appear in all pickers (template node, message composer) without waiting
      // for manual Meta submission.
      approvalStatus: "approved",
      metaTemplateId: `LIB_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
    };

    // Persist immediately — same key used everywhere
    setGlobalTemplates(prev => [...prev, newTemplate]);

    // Open in edit mode so user can customise further
    handleEditTemplate(newTemplate);
    setTemplatesView("builder");
    setShowVarMapping(false);
    toast.success(`"${tpl.name}" cloned from library and ready to use`);
  };

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
    setTemplateForm({ name: "", identifier: "", category: "Marketing", language: "English", header: { type: "none", content: "" }, bodyText: "", footerText: "", buttons: [], variableMappings: {}, headerType: "none", headerText: "", headerMediaUrl: "", headerFileName: "", approvalStatus: "pending" });
    setTemplatesView("builder");
    setShowVarMapping(false);
  };

  const handleEditTemplate = (tpl: WhatsappTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateForm({ name: tpl.name, identifier: tpl.identifier, category: tpl.category, language: tpl.language, header: tpl.header || { type: "none", content: "" }, bodyText: tpl.bodyText, footerText: tpl.footerText || "", buttons: tpl.buttons || [], variableMappings: tpl.variableMappings || {}, headerType: tpl.headerType || "none", headerText: tpl.headerText || "", headerMediaUrl: tpl.headerMediaUrl || "", headerFileName: tpl.headerFileName || "", approvalStatus: tpl.approvalStatus || "pending", metaTemplateId: tpl.metaTemplateId, submittedAt: tpl.submittedAt, reviewedAt: tpl.reviewedAt, rejectionReason: tpl.rejectionReason });
    setTemplatesView("builder");
    setShowVarMapping(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setGlobalTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted successfully");
      if (editingTemplateId === id) { setTemplatesView("table"); setEditingTemplateId(null); }
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim()) { toast.error("Template name is required"); return; }
    if (!templateForm.identifier.trim()) { toast.error("Template identifier is required"); return; }
    if (!templateForm.bodyText.trim()) { toast.error("Template body text is required"); return; }
    const mediaTypes = ["image", "video", "document"] as const;
    if (templateForm.headerType && mediaTypes.includes(templateForm.headerType as any) && !templateForm.headerMediaUrl?.trim()) {
      toast.error("Media header requires a file upload"); return;
    }
    const isDuplicate = globalTemplates.some(t => t.identifier.toLowerCase() === templateForm.identifier.toLowerCase() && t.id !== editingTemplateId);
    if (isDuplicate) { toast.error("Template identifier must be unique"); return; }
    if (editingTemplateId) {
      setGlobalTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, ...templateForm } : t));
      toast.success("Template updated successfully");
    } else {
      const newTemplate: WhatsappTemplate = { id: `tpl-${Date.now()}`, ...templateForm, createdAt: new Date().toISOString(), approvalStatus: "pending" };
      setGlobalTemplates(prev => [...prev, newTemplate]);
      toast.success("Template created successfully");
    }
    setTemplatesView("table");
    setEditingTemplateId(null);
  };

  // ── Action Dropdowns Position State & Refs ──
  const [openMenuTemplateId, setOpenMenuTemplateId] = useState<string | null>(null);
  const [templateMenuPos, setTemplateMenuPos] = useState<{ top: number; left: number } | null>(null);
  const templateTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [openMenuCampaignId, setOpenMenuCampaignId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const campaignTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [approvingTemplate, setApprovingTemplate] = useState<WhatsappTemplate | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingCampaign, setSharingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({ name: "", audience: "" });
  const [campaignNodes, setCampaignNodes] = useState<CampaignNode[]>([
    { id: "n1", type: "message", label: "Message 1", content: "", templateIdentifier: "" },
    { id: "n2", type: "end", label: "End Flow" },
  ]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Close menus on scroll (page or container scroll) and screen resize
  useEffect(() => {
    if (!openMenuTemplateId && !openMenuCampaignId) return;
    const handleScroll = () => {
      setOpenMenuTemplateId(null);
      setOpenMenuCampaignId(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [openMenuTemplateId, openMenuCampaignId]);

  const openTemplateMenu = (templateId: string) => {
    const btn = templateTriggerRefs.current[templateId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setTemplateMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 208, // right-align button (w-52 = 208px)
      });
    }
    setOpenMenuTemplateId(templateId);
  };

  const openCampaignMenu = (campaignId: string) => {
    const btn = campaignTriggerRefs.current[campaignId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 176, // right-align button (w-44 = 176px)
      });
    }
    setOpenMenuCampaignId(campaignId);
  };

  const handleTemplateApprovalSubmit = (templateId: string, patch: Partial<WhatsappTemplate>) => {
    const approvedPatch: Partial<WhatsappTemplate> = {
      ...patch,
      approvalStatus: "approved",
      reviewedAt: new Date().toISOString(),
    };
    setGlobalTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...approvedPatch } : t));
    const targetTpl = globalTemplates.find(t => t.id === templateId);
    toast.success(`"${targetTpl?.name || "Template"}" approved and ready to use`);
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
    handleOpenCreate();
    handleTabChange("campaigns");
  };

  const handleShareCampaign = (
    campaign: Campaign,
    payload: {
      channel: "whatsapp" | "sms";
      clientIds: string[];
      manualRecipients: { name?: string; phone: string }[];
      audienceName?: string;
    }
  ) => {
    const totalRecipients = payload.clientIds.length + payload.manualRecipients.length;
    if (totalRecipients === 0) return;

    setConversations(prev => {
      const updated = [...prev];

      const processRecipient = (name: string, phone: string) => {
        let existingIdx = updated.findIndex(c => c.phoneNumber === phone);
        let convo: Conversation;
        if (existingIdx >= 0) {
          convo = { ...updated[existingIdx] };
        } else {
          convo = {
            id: `conv-share-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            contactName: name,
            phoneNumber: phone,
            channel: payload.channel,
            lastMessage: "",
            timestamp: "Just now",
            unreadCount: 0,
            status: "open",
            messages: [],
            botStatus: "off",
            assignedPersonId: "",
          };
          updated.push(convo);
          existingIdx = updated.length - 1;
        }

        const stepRes = advanceCampaignStep(convo as ConversationShape, campaign, 0);
        const newMsgs: Message[] = stepRes.newMessages.map(m => ({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: m.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: m.sender,
          origin: (m.origin || "campaign") as Message["origin"],
          buttons: m.buttons,
          header: m.header,
        }));
        const lastMsg = newMsgs[newMsgs.length - 1];
        const existingEnrollments = convo.campaignEnrollments || [];
        const filteredEnrollments = existingEnrollments.filter(e => e.campaignId !== campaign.id);
        updated[existingIdx] = {
          ...convo,
          channel: payload.channel,
          messages: [...convo.messages, ...newMsgs],
          lastMessage: lastMsg?.text || convo.lastMessage || campaign.name,
          timestamp: "Just now",
          campaignEnrollments: [...filteredEnrollments, stepRes.enrollmentPatch],
        };
      };

      // 1. Process clientIds via shared getClientList — same data source as CampaignShareModal
      const allClients = getClientList();
      payload.clientIds.forEach(clientId => {
        const found = allClients.find(c => c.id === clientId);
        const clientName = found?.name || clientId;
        // Never fall back to a shared default phone — use a per-client unique fallback
        const clientPhone = (found?.phoneNumber && found.phoneNumber.trim() !== "")
          ? found.phoneNumber
          : `unresolved-${clientId}`;
        processRecipient(clientName, clientPhone);
      });

      // 2. Process manualRecipients
      payload.manualRecipients.forEach(rec => {
        const name = rec.name || rec.phone;
        const phone = rec.phone;
        processRecipient(name, phone);
      });

      return updated;
    });

    setCampaigns(prev =>
      prev.map(c =>
        c.id === campaign.id
          ? {
            ...c,
            audienceName: payload.audienceName,
            audienceClientIds: payload.clientIds,
            audienceManualRecipients: payload.manualRecipients,
            audience: `${payload.audienceName} (${totalRecipients})`,
            // Increment sent & delivered (demo flow mirrors them)
            sent: (c.sent || 0) + totalRecipients,
            delivered: (c.delivered || 0) + totalRecipients,
            // Sharing a draft campaign activates it (Launch button is removed)
            status: c.status === "draft" ? "active" : c.status,
          }
          : c
      )
    );

    toast.success(`Campaign shared with ${totalRecipients} recipient${totalRecipients !== 1 ? "s" : ""}`);
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
      messageMode: type === "message" ? "text" : undefined,
      targetBotId: type === "message" ? "" : undefined,
      conditionFieldSource: type === "condition" ? "client" : undefined,
      conditionField: type === "condition" ? "name" : undefined,
      conditionOp: type === "condition" ? "equals" : undefined,
      conditionValue: type === "condition" ? "" : undefined,
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
    setEditingCampaignId(null);
  };

  // ── Chatbot state is now managed inside <ChatbotTab /> ──

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-6">
        <PageHeader title="Chats" subtitle="Message clients over WhatsApp and SMS, and set up automated chat campaigns">
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Chats Works" />
        </PageHeader>

        {/* Main Content Area with Collapsible Left Navigation Sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex min-h-[calc(100vh-180px)] overflow-hidden">
          <InboxNavSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            channelFilter={channelFilter}
            setChannelFilter={setChannelFilter}
            showChatbotTab={LEGACY_CHATBOT_MODULE_ENABLED}
          />

          <div className="flex-1 min-w-0 bg-white p-4 overflow-y-auto">
            {/* ══════════════════════════════════════════════════════
                TAB: CHATS INBOX
            ══════════════════════════════════════════════════════ */}
            {/* ══════════════════════════════════════════════════════
                TAB: CHATS INBOX
            ══════════════════════════════════════════════════════ */}
            {activeTab === "chats" && (
              <div className="flex h-[calc(100vh-230px)] overflow-hidden">
                {/* Pane 1 — List Pane */}
                {isListPaneCollapsed ? (
                  <div className="w-12 shrink-0 border-r border-gray-200 flex flex-col items-center py-3 bg-slate-50 space-y-4">
                    <button
                      type="button"
                      onClick={() => setIsListPaneCollapsed(false)}
                      className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                      title="Expand chat list"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                    {filteredConversations.filter(c => c.unreadCount > 0).length > 0 && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm" title="Unread chats">
                        {filteredConversations.filter(c => c.unreadCount > 0).length}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-[320px] shrink-0 border-r border-gray-200 flex flex-col h-full" style={{ backgroundColor: '#F8FAFC' }}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-white space-y-2 relative">

                      {/* Row 1 — Number switcher dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNumberFilterDropdown(prev => !prev);
                            setShowViewFilterDropdown(false);
                          }}
                          className="flex items-center gap-1.5 text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors min-w-0 max-w-full"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <span className="truncate">
                            {numberFilter === "all" || availableNumbersForChannel.length === 0
                              ? "All Numbers"
                              : numberFilter}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${showNumberFilterDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showNumberFilterDropdown && (
                          <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 space-y-0.5 text-xs font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            <button
                              type="button"
                              onClick={() => { setNumberFilter("all"); setShowNumberFilterDropdown(false); }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                numberFilter === "all" ? "text-blue-700 font-bold bg-blue-50/50" : "text-gray-700"
                              }`}
                            >
                              <span>All Numbers</span>
                              {numberFilter === "all" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                            {availableNumbersForChannel.map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => { setNumberFilter(num); setShowNumberFilterDropdown(false); }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                  numberFilter === num ? "text-blue-700 font-bold bg-blue-50/50" : "text-gray-700"
                                }`}
                              >
                                <span>{num}</span>
                                {numberFilter === num && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Row 2 — Search + Filter funnel + Collapse */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={chatSearch}
                            onChange={e => setChatSearch(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        </div>

                        {/* View filter button */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setShowViewFilterDropdown(prev => !prev);
                              setShowNumberFilterDropdown(false);
                            }}
                            className={`p-1.5 rounded-lg transition-colors relative ${
                              viewFilter !== "all"
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                            title="Filter view"
                          >
                            <Filter className="w-4 h-4" />
                            {viewFilter !== "all" && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-600" />
                            )}
                          </button>

                          {showViewFilterDropdown && (
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 space-y-0.5 text-xs font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {(["all", "open", "unread", "resolved", "assigned_to_me"] as const).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => { setViewFilter(v); setShowViewFilterDropdown(false); }}
                                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                    viewFilter === v ? "text-green-700 font-bold bg-green-50/50" : "text-gray-700"
                                  }`}
                                >
                                  <span>{v === "all" ? "All" : v === "open" ? "Open" : v === "unread" ? "Unread" : v === "resolved" ? "Resolved" : "Assigned to me"}</span>
                                  {viewFilter === v && <Check className="w-3.5 h-3.5 text-green-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsListPaneCollapsed(true)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 shrink-0"
                          title="Collapse chat list"
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row 3 — Contextual chat count */}
                      <p className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {filteredConversations.length}{" "}
                        {viewFilter === "open" ? "Active Chats" :
                          viewFilter === "resolved" ? "Solved Chats" :
                          viewFilter === "unread" ? "Unread Chats" :
                          viewFilter === "assigned_to_me" ? "Assigned Chats" :
                          "Total Chats"}
                        {filteredConversations.filter(c => c.unreadCount > 0).length > 0 && (
                          <span className="ml-1.5 text-blue-500 font-semibold">
                            · {filteredConversations.filter(c => c.unreadCount > 0).length} Unread
                          </span>
                        )}
                      </p>
                    </div>
                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto">
                    {channelFilter === null ? (
                      <div className="p-10 flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600" style={{ fontFamily: "DM Sans, sans-serif" }}>Select a channel</p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>Choose WhatsApp, SMS, or Website from the sidebar to view conversations.</p>
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>No conversations found.</div>
                    ) : filteredConversations.map(conv => {
                      const isSelected = conv.id === selectedConversationId;
                      const hasHuman = !!conv.assignedPersonId;
                      const isBotActive = !hasHuman && conv.botStatus === "active";
                      const isBotPausedOrHuman = hasHuman || conv.botStatus === "paused";
                      const statusDotColor = isBotActive ? "bg-blue-500" : isBotPausedOrHuman ? "bg-amber-500" : "bg-gray-400";
                      const statusDotTitle = isBotActive ? "Bot: Active" : isBotPausedOrHuman ? "Bot Paused / Assigned" : "Bot Off";
                      const assignedPerson = conv.assignedPersonId ? AVAILABLE_EMPLOYEES.find(e => e.id === conv.assignedPersonId) : null;

                      return (
                        <div key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                          className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-blue-50/30 transition-all border-l-2 border-b border-gray-100 ${isSelected ? "bg-blue-50 border-l-blue-600" : "border-l-transparent bg-white"}`}>
                          <div className="relative flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
                              {getInitials(conv.contactName)}
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm" style={{ width: '18px', height: '18px' }}>
                              {conv.channel === "whatsapp" ? <MessageCircle className="w-3 h-3 text-[#25D366]" /> :
                                conv.channel === "sms" ? <MessageSquare className="w-3 h-3 text-blue-600" /> :
                                  <Globe className="w-3 h-3 text-purple-600" />}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor}`} title={statusDotTitle} />
                              <h4 className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-gray-900"}`} style={{ fontFamily: "DM Sans, sans-serif" }}>{conv.contactName}</h4>
                              {assignedPerson && (
                                <span className="text-[9px] text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                                  👤 {getInitials(assignedPerson.name)}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-auto" style={{ fontFamily: "Outfit, sans-serif" }}>{conv.timestamp}</span>
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
                )}

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
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${!!activeConversation.assignedPersonId ? "bg-amber-500" :
                                  activeConversation.botStatus === "active" ? "bg-blue-500" :
                                    activeConversation.botStatus === "paused" ? "bg-amber-500" :
                                      "bg-gray-400"
                                }`} title={`Status dot`} />
                              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{activeConversation.contactName}</h3>
                              {activeConversation.assignedPersonId && (() => {
                                const emp = AVAILABLE_EMPLOYEES.find(e => e.id === activeConversation.assignedPersonId);
                                return emp ? (
                                  <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
                                    Assigned to {emp.name}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-gray-400 font-mono">{activeConversation.phoneNumber}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase ml-1 ${CHANNEL_CLASSES[activeConversation.channel]}`}>
                            {CHANNEL_LABELS[activeConversation.channel]}
                          </span>
                          {activeConversation.inboxNumber && (
                            <span className="text-xs text-gray-500 font-medium ml-1">
                              via {activeConversation.inboxNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Unified Read-only status chip */}
                          {(() => {
                            const isHumanAssigned = !!activeConversation.assignedPersonId;
                            const isBotActive = !isHumanAssigned && activeConversation.botStatus === "active";
                            if (isBotActive) {
                              return (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                                  <span>🤖 Bot Active</span>
                                </div>
                              );
                            } else if (isHumanAssigned) {
                              const emp = AVAILABLE_EMPLOYEES.find(e => e.id === activeConversation.assignedPersonId);
                              const name = emp ? emp.name : "Agent";
                              return (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                  <span>👤 Bot Paused / Assigned to {name}</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                                  <span>⚪ Unassigned (Bot Off)</span>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>

                      {/* Hand-off / Paused Bot warning banner */}
                      {activeConversation.assignedPersonId && (() => {
                        const emp = AVAILABLE_EMPLOYEES.find(e => e.id === activeConversation.assignedPersonId);
                        const name = emp ? emp.name : "Agent";
                        return (
                          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between flex-shrink-0 text-xs text-amber-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <div className="flex items-center gap-1.5 font-medium">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Bot is paused. Conversation is assigned to <strong>{name}</strong>.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, botStatus: "active", assignedPersonId: "" } : c));
                                toast.success("Bot resumed and human assignment cleared");
                              }}
                              className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              Resume Bot
                            </button>
                          </div>
                        );
                      })()}

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
                                {msg.buttons && msg.buttons.length > 0 && (
                                  <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-hidden mt-0.5">
                                    {msg.buttons.map((btn, bi) => (
                                      <div
                                        key={bi}
                                        className={`px-3 py-2 text-xs font-semibold text-center text-blue-600 ${bi > 0 ? "border-t border-gray-100" : ""
                                          }`}
                                      >
                                        {btn.label}{" "}
                                        {btn.actionType && btn.actionType !== "quick_reply" && (
                                          <span className="text-[9px] text-gray-400 ml-1">↗</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-all flex-shrink-0"
                            title="Attach file">
                            <Paperclip className="w-4 h-4" />
                          </button>

                          {/* Gear Menu Trigger and Upward Dropdowns */}
                          <div className="relative flex-shrink-0" ref={gearMenuRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setShowComposerGearMenu((v) => !v);
                                setShowUseTemplateDropdown(false);
                              }}
                              className={`p-2 rounded-lg transition-all flex-shrink-0 ${showComposerGearMenu
                                  ? "bg-gray-200 text-gray-800"
                                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                }`}
                              title="Conversation Actions"
                            >
                              <Settings className="w-4 h-4" />
                            </button>

                            {/* Upward-expanding Gear Menu */}
                            {showComposerGearMenu && (
                              <div className="absolute bottom-full mb-2 left-0 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 text-xs font-medium text-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {assignAgentMenuOpen ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 font-bold text-gray-900 bg-gray-50 text-[10px] uppercase tracking-wider">
                                      <button
                                        type="button"
                                        onClick={() => setAssignAgentMenuOpen(false)}
                                        className="p-1 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors text-xs font-bold font-mono"
                                      >
                                        &lt;
                                      </button>
                                      <span>Assign Responsible</span>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto py-1">
                                      {AVAILABLE_EMPLOYEES.map(emp => (
                                        <button
                                          key={emp.id}
                                          type="button"
                                          onClick={() => {
                                            setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, botStatus: "paused", assignedPersonId: emp.id } : c));
                                            toast.success(`Assigned to ${emp.name}. Bot paused.`);
                                            setShowComposerGearMenu(false);
                                            setAssignAgentMenuOpen(false);
                                          }}
                                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-left transition-colors ${activeConversation.assignedPersonId === emp.id ? "bg-amber-50 text-amber-900 font-semibold" : "text-gray-700"
                                            }`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeConversation.assignedPersonId === emp.id ? "bg-amber-500" : "bg-gray-300"}`} />
                                          <span>{emp.name}</span>
                                        </button>
                                      ))}
                                      {activeConversation.assignedPersonId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, assignedPersonId: "" } : c));
                                            toast.success(`Cleared assignment`);
                                            setShowComposerGearMenu(false);
                                            setAssignAgentMenuOpen(false);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 text-red-600 text-left font-semibold border-t border-gray-100 transition-colors"
                                        >
                                          <span>Clear Assignment</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* 1. Templates */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowComposerGearMenu(false);
                                          setShowUseTemplateDropdown(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-left transition-colors"
                                      >
                                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Templates</span>
                                      </button>
                                    )}

                                    {/* 2. Assign Chatbot */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowComposerGearMenu(false);
                                          setShowAssignBotModal(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-left transition-colors"
                                      >
                                        <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Assign Chatbot</span>
                                      </button>
                                    )}

                                    {/* 3. Enroll in Campaign */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowComposerGearMenu(false);
                                          setShowEnrollCampaignModal(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-left transition-colors"
                                      >
                                        <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                                        <span>Enroll in Campaign</span>
                                      </button>
                                    )}

                                    {/* 4. Assign Responsible */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignAgentMenuOpen(true);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-left transition-colors"
                                    >
                                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>Assign Responsible</span>
                                    </button>

                                    <div className="my-1 border-t border-gray-100" />

                                    {/* 5. Take Over from Bot */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (
                                      (() => {
                                        const isBotActive =
                                          activeConversation.assignedBotId &&
                                          (activeConversation.botStatus ?? "off") === "active" &&
                                          !activeConversation.assignedPersonId;
                                        return (
                                          <button
                                            type="button"
                                            disabled={!isBotActive}
                                            onClick={() => {
                                              setShowComposerGearMenu(false);
                                              setConversations((prev) =>
                                                prev.map((c) =>
                                                  c.id === selectedConversationId
                                                    ? { ...c, botStatus: "paused", assignedPersonId: "1" }
                                                    : c
                                                )
                                              );
                                              toast.success("Bot paused. You took over the conversation.");
                                            }}
                                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${isBotActive
                                                ? "hover:bg-gray-50 text-gray-700 cursor-pointer"
                                                : "opacity-40 cursor-not-allowed text-gray-400"
                                              }`}
                                          >
                                            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                                            <span>Take Over from Bot</span>
                                          </button>
                                        );
                                      })()
                                    )}

                                    {/* 6. Test (DEV-only) */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowComposerGearMenu(false);
                                          setShowTestContactDrawer(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-purple-50 text-purple-700 font-semibold text-left transition-colors"
                                      >
                                        <FlaskConical className="w-4 h-4 text-purple-600 shrink-0" />
                                        <span>Test</span>
                                        <span className="ml-auto text-[9px] font-mono bg-purple-100 text-purple-700 px-1 rounded">DEV</span>
                                      </button>
                                    )}

                                    {/* 7. Pause / Resume Bot */}
                                    {LEGACY_CHATBOT_MODULE_ENABLED && (activeConversation.botStatus ?? "off") !== "off" && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowComposerGearMenu(false);
                                          handleToggleBotStatus();
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${(activeConversation.botStatus ?? "off") === "paused"
                                            ? "hover:bg-amber-50 text-amber-700 font-semibold"
                                            : "hover:bg-gray-50 text-gray-700"
                                          }`}
                                      >
                                        {(activeConversation.botStatus ?? "off") === "active" ? (
                                          <>
                                            <Pause className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>Pause Bot</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>Resume Bot</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* 8. Mark Resolved / Re-open */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowComposerGearMenu(false);
                                        handleMarkResolved();
                                      }}
                                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${activeConversation.status === "resolved"
                                          ? "hover:bg-green-50 text-green-700 font-semibold"
                                          : "hover:bg-gray-50 text-gray-700"
                                        }`}
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                      <span>{activeConversation.status === "resolved" ? "Re-open Conversation" : "Mark Resolved"}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Upward-expanding Template Picker Menu */}
                            {LEGACY_CHATBOT_MODULE_ENABLED && showUseTemplateDropdown && (
                              <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="p-2.5 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Template</span>
                                  <button onClick={() => setShowUseTemplateDropdown(false)}><X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>
                                </div>
                                <div className="max-h-56 overflow-y-auto py-1">
                                  {globalTemplates.filter(t => !t.approvalStatus || t.approvalStatus === "approved").length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500">No approved templates yet. Create and submit a template for approval first, or clone one from the Template Library.</div>
                                  ) : (
                                    globalTemplates.filter(t => !t.approvalStatus || t.approvalStatus === "approved").map((t) => (
                                      <div key={t.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 transition-colors group">
                                        <button
                                          onClick={() => {
                                            setComposerText(t.bodyText);
                                            setShowUseTemplateDropdown(false);
                                          }}
                                          className="flex-1 text-left text-gray-700 font-medium truncate mr-2 group-hover:text-blue-600"
                                          title="Insert text into composer"
                                        >
                                          {t.name}
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleSendTemplateDirectly(t);
                                            setShowUseTemplateDropdown(false);
                                          }}
                                          className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
                                          title="Send template directly with buttons"
                                        >
                                          Send
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="relative flex-1">
                            <input type="text" value={composerText} onChange={e => setComposerText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                              placeholder="Type a message..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ fontFamily: "Outfit, sans-serif" }} />
                          </div>

                          <button type="button" onClick={handleSendMessage}
                            className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Select a conversation to start chatting
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* ══════════════════════════════════════════════════════
            TAB: TEMPLATE BUILDER
        ══════════════════════════════════════════════════════ */}
            {activeTab === "templates" && templatesView === "table" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Templates</h2>
                    <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                      {globalTemplates.length} {globalTemplates.length === 1 ? "template" : "templates"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setShowTemplateLibrary(true)}>
                      <LibraryBig className="w-4 h-4" /> Browse Library
                    </Button>
                    <Button variant="primary" onClick={() => { handleCreateNewTemplate(); setTemplatesView("builder"); }}>
                      <Plus className="w-4 h-4" /> Create Template
                    </Button>
                  </div>
                </div>

                {/* Templates Table — always rendered */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead style={{ backgroundColor: "#1F2937" }}>
                      <tr>
                        {["Name", "Identifier", "Category", "Status", "Language", "Actions"].map(col => (
                          <th key={col} className={`px-5 py-3 text-[11px] font-bold text-white uppercase tracking-wider ${col === "Actions" ? "text-right" : "text-left"}`} style={{ fontFamily: "Outfit, sans-serif" }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {globalTemplates.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center bg-white">
                            <FileText className="w-8 h-8 mx-auto text-blue-300 mb-3" />
                            <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>No templates yet</h3>
                            <p className="text-xs text-gray-500 mb-5" style={{ fontFamily: "Outfit, sans-serif" }}>Build a pre-approved WhatsApp message template to reuse in campaigns and chatbot flows.</p>
                            <div className="flex items-center justify-center gap-3">
                              <Button variant="outline" onClick={() => setShowTemplateLibrary(true)}>
                                <LibraryBig className="w-4 h-4" /> Browse Template Library
                              </Button>
                              <Button variant="primary" onClick={() => { handleCreateNewTemplate(); setTemplatesView("builder"); }}>
                                <Plus className="w-4 h-4" /> Create Your First Template
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        globalTemplates.map(tpl => (
                          <tr key={tpl.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-5 py-4">
                              <button onClick={() => { handleEditTemplate(tpl); setTemplatesView("builder"); }} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {tpl.name}
                              </button>
                            </td>
                            <td className="px-4 py-4"><span className="text-xs font-mono text-gray-500">{tpl.identifier}</span></td>
                            <td className="px-4 py-4"><span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase">{tpl.category}</span></td>
                            {/* STATUS column */}
                            <td className="px-4 py-4">
                              {(!tpl.approvalStatus || tpl.approvalStatus === "pending") && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 uppercase">Pending</span>
                              )}
                              {tpl.approvalStatus === "approved" && (
                                <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 uppercase">Approved</span>
                              )}
                              {tpl.approvalStatus === "denied" && (
                                <span title={tpl.rejectionReason || "Denied by Meta"} className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 rounded-full px-2 py-0.5 uppercase cursor-help">Denied</span>
                              )}
                            </td>
                            <td className="px-4 py-4"><span className="text-xs text-gray-500">{tpl.language}</span></td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end">
                                <button
                                  ref={el => { templateTriggerRefs.current[tpl.id] = el; }}
                                  onClick={() => openMenuTemplateId === tpl.id ? setOpenMenuTemplateId(null) : openTemplateMenu(tpl.id)}
                                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "templates" && templatesView === "builder" && (() => {
              // ── Drag-and-drop state for media header upload (scoped to builder render) ──
              const mediaTypes = ["image", "video", "document"] as const;
              const acceptForHeaderType =
                templateForm.headerType === "image" ? ".png,.jpg,.jpeg"
                  : templateForm.headerType === "video" ? ".mp4"
                    : ".pdf,.doc,.docx";

              const handleFileDrop = (file: File) => {
                const objectUrl = URL.createObjectURL(file);
                setTemplateForm(prev => ({ ...prev, headerMediaUrl: objectUrl, headerFileName: file.name }));
              };

              return (
                <div className="flex gap-6 items-start">
                  <form onSubmit={handleSaveTemplate} className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{editingTemplateId ? "Edit Template" : "New WhatsApp Template"}</h3>
                      <button type="button" onClick={() => setTemplatesView("table")}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
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

                    {/* ── HEADER (moved above Body) ── */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Header <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <div className="flex gap-1 text-[11px]">
                          {(["none", "text", "image", "video", "document"] as const).map(ht => (
                            <button
                              key={ht}
                              type="button"
                              onClick={() => setTemplateForm(prev => ({ ...prev, headerType: ht, headerText: ht === "text" ? prev.headerText || "" : "", headerMediaUrl: ht !== "text" && ht !== "none" ? "" : "", headerFileName: "" }))}
                              className={`px-2 py-0.5 rounded-full border capitalize transition-colors ${templateForm.headerType === ht ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}
                            >
                              {ht}
                            </button>
                          ))}
                        </div>
                      </div>
                      {templateForm.headerType && templateForm.headerType !== "none" && (
                        <div className="p-4 space-y-3 bg-white">
                          {templateForm.headerType === "text" ? (
                            <div>
                              <label className="text-xs font-semibold text-gray-600 mb-1 block">Header Text</label>
                              <input
                                type="text"
                                value={templateForm.headerText || ""}
                                onChange={e => setTemplateForm(prev => ({ ...prev, headerText: e.target.value }))}
                                placeholder="Bold headline text..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* File uploaded — show chip */}
                              {templateForm.headerMediaUrl ? (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-blue-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                      {templateForm.headerFileName || "Uploaded file"}
                                    </p>
                                    <p className="text-[10px] text-blue-500" style={{ fontFamily: "Outfit, sans-serif" }}>Stored as local object URL</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setTemplateForm(prev => ({ ...prev, headerMediaUrl: "", headerFileName: "" }))}
                                    className="p-1 text-blue-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                /* Drag-and-drop upload zone */
                                <div
                                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); }}
                                  onDragLeave={e => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50'); }}
                                  onDrop={e => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFileDrop(file);
                                  }}
                                  className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all hover:border-blue-400"
                                >
                                  <input
                                    type="file"
                                    accept={acceptForHeaderType}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                    <p className="text-sm font-medium text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                      <span className="text-blue-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                                      {templateForm.headerType === "image" ? "PNG, JPG up to 5MB" : templateForm.headerType === "video" ? "MP4 up to 16MB" : "PDF up to 100MB"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Body Text ── */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Body Text *</label>
                        <VariablePickerButton targetRef={textareaRef} value={templateForm.bodyText} onChange={val => setTemplateForm(prev => ({ ...prev, bodyText: val }))} label="{ } Insert Variable" />
                      </div>
                      <textarea ref={textareaRef} required value={templateForm.bodyText} onChange={e => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                        placeholder="Hello {{contact_name}}, your appointment is confirmed for {{appointment_date}}." rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" style={{ fontFamily: "Outfit, sans-serif" }} />

                      {/* ── Variable Field Mapping panel ── */}
                      {(() => {
                        const tokens = [...(templateForm.bodyText.matchAll(/\{\{([^}]+)\}\}/g))].map(m => m[1].trim()).filter((v, i, a) => a.indexOf(v) === i);
                        if (tokens.length === 0) return null;
                        return (
                          <div className="border border-blue-100 rounded-xl overflow-hidden mt-2">
                            <button
                              type="button"
                              onClick={() => setShowVarMapping(v => !v)}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100/60 transition-colors text-xs font-semibold text-blue-700"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              <span>📌 Field Mapping — {tokens.length} variable{tokens.length !== 1 ? "s" : ""} detected</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${showVarMapping ? "rotate-180" : ""}`} />
                            </button>
                            {showVarMapping && (
                              <div className="p-3 space-y-3 bg-white">
                                <p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Map each <code className="bg-gray-100 px-1 rounded">&#123;&#123;variable&#125;&#125;</code> to a static value, a MantraAssist field, or live availability.
                                </p>
                                {tokens.map(token => {
                                  const mapping = (templateForm.variableMappings || {})[token] || { source: "static" as const, staticValue: "", fieldKey: "" };
                                  const setMapping = (patch: Partial<typeof mapping>) =>
                                    setTemplateForm(prev => ({
                                      ...prev,
                                      variableMappings: {
                                        ...(prev.variableMappings || {}),
                                        [token]: { ...mapping, ...patch }
                                      }
                                    }));
                                  return (
                                    <div key={token} className="p-3 border border-gray-100 rounded-lg bg-gray-50 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <code className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">&#123;&#123;{token}&#125;&#125;</code>
                                        <div className="flex gap-1 ml-auto">
                                          {(["static", "field", "availability"] as const).map(src => (
                                            <button
                                              key={src}
                                              type="button"
                                              onClick={() => setMapping({ source: src })}
                                              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors capitalize ${mapping.source === src
                                                  ? "bg-blue-600 text-white border-blue-600"
                                                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-400"
                                                }`}
                                            >
                                              {src}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {mapping.source === "static" && (
                                        <input
                                          type="text"
                                          value={mapping.staticValue || ""}
                                          onChange={e => setMapping({ staticValue: e.target.value })}
                                          placeholder="Static replacement value"
                                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        />
                                      )}
                                      {mapping.source === "field" && (
                                        <select
                                          value={mapping.fieldKey || ""}
                                          onChange={e => setMapping({ fieldKey: e.target.value })}
                                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                                        >
                                          <option value="">Select a MantraAssist field…</option>
                                          <optgroup label="Client">
                                            <option value="client.name">Client Name</option>
                                            <option value="client.email">Client Email</option>
                                            <option value="client.phone">Client Phone</option>
                                          </optgroup>
                                          <optgroup label="Appointment">
                                            <option value="appointment.date">Appointment Date</option>
                                            <option value="appointment.time">Appointment Time</option>
                                            <option value="appointment.service">Service Name</option>
                                          </optgroup>
                                          <optgroup label="Team Member">
                                            <option value="teamMember.name">Provider Name</option>
                                            <option value="teamMember.phone">Provider Phone</option>
                                          </optgroup>
                                        </select>
                                      )}
                                      {mapping.source === "availability" && (
                                        <p className="text-[11px] text-gray-500 italic" style={{ fontFamily: "Outfit, sans-serif" }}>
                                          Will resolve to the contact's next available slot at send time.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── Header section removed from here (moved above Body) ── */}

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
                              <option value="email">Send Email</option>
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
                          {btn.type === "email" && (
                            <input
                              type="email"
                              value={btn.value || ""}
                              onChange={e => handleButtonChange(index, "value", e.target.value)}
                              placeholder="support@example.com"
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg font-mono"
                            />
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
                      <Button variant="outline" type="button" onClick={() => { setTemplatesView("table"); setEditingTemplateId(null); }}>Cancel</Button>
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
                          {/* Header preview */}
                          {templateForm.headerType === "text" && templateForm.headerText && (
                            <p className="font-bold text-[11px] text-gray-900 leading-tight">{templateForm.headerText}</p>
                          )}
                          {templateForm.headerType === "image" && templateForm.headerMediaUrl && (
                            templateForm.headerMediaUrl.startsWith("blob:") ? (
                              <img src={templateForm.headerMediaUrl} alt="Header preview" className="w-full rounded object-cover max-h-20" />
                            ) : (
                              <div className="w-full h-14 bg-gray-100 rounded flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              </div>
                            )
                          )}
                          {templateForm.headerType === "video" && (
                            <div className="w-full h-14 bg-gray-900 rounded flex items-center justify-center gap-1.5">
                              <Play className="w-5 h-5 text-white" />
                              <span className="text-[9px] text-white font-medium">Video</span>
                            </div>
                          )}
                          {templateForm.headerType === "document" && (
                            <div className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1">
                              <FileText className="w-4 h-4 text-red-500" />
                              <span className="text-[9px] text-gray-700 font-medium truncate">{templateForm.headerFileName || "document.pdf"}</span>
                            </div>
                          )}
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
                </div>
              );
            })()}


            {/* ══════════════════════════════════════════════════════
            TAB: CAMPAIGNS
        ══════════════════════════════════════════════════════ */}
            {activeTab === "campaigns" && (
              showCampaignBuilder ? (
                <CampaignBuilderView
                  campaignForm={campaignForm} setCampaignForm={setCampaignForm}
                  campaignNodes={campaignNodes} setCampaignNodes={setCampaignNodes}
                  editingNodeId={editingNodeId} setEditingNodeId={setEditingNodeId}
                  editingCampaignId={editingCampaignId} globalTemplates={globalTemplates}
                  handleAddNode={handleAddNode} handleSaveCampaign={handleSaveCampaign}
                  onBack={() => setShowCampaignBuilder(false)} />
              ) : (
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
                            {["Campaign Name", "Status", "Audience", "Sent", "Created", "Actions"].map(col => (
                              <th key={col} className={`px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider ${col === "Actions" ? "text-center" : ""}`} style={{ fontFamily: "Outfit, sans-serif" }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {campaigns.map(campaign => (
                            <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3"><p className="text-sm font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{campaign.name}</p></td>
                              <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_COLOR[campaign.status]}`}>{campaign.status}</span></td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const clientCount = campaign.audienceClientIds?.length ?? 0;
                                  const manualCount = campaign.audienceManualRecipients?.length ?? 0;
                                  const totalCount = clientCount + manualCount;
                                  const displayName = campaign.audienceName || campaign.audience;

                                  if (displayName) {
                                    if (!LEGACY_CHATBOT_MODULE_ENABLED) {
                                      return (
                                        <span className="text-xs text-purple-700 font-semibold block">
                                          {displayName}{totalCount > 0 ? ` (${totalCount})` : ""}
                                        </span>
                                      );
                                    }
                                    return (
                                      <button
                                        onClick={() => { setSharingCampaign(campaign); setShowShareModal(true); }}
                                        className="text-xs text-purple-700 font-semibold hover:underline text-left block"
                                        title="Click to manage audience"
                                      >
                                        {displayName}{totalCount > 0 ? ` (${totalCount})` : ""}
                                      </button>
                                    );
                                  }
                                  return <span className="text-gray-400 italic text-xs">No audience selected</span>;
                                })()}
                              </td>
                              <td className="px-4 py-3"><p className="text-sm font-bold text-gray-900">{campaign.sent.toLocaleString()}</p></td>
                              <td className="px-4 py-3"><p className="text-xs text-gray-400">{campaign.createdAt}</p></td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center">
                                  <button
                                    ref={el => { campaignTriggerRefs.current[campaign.id] = el; }}
                                    onClick={() => openMenuCampaignId === campaign.id ? setOpenMenuCampaignId(null) : openCampaignMenu(campaign.id)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                                  >
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
              )
            )}


            {/* ══════════════════════════════════════════════════════
            TAB: CHATBOT — Managed by ChatbotTab component
        ══════════════════════════════════════════════════════ */}
            {activeTab === "chatbot" && LEGACY_CHATBOT_MODULE_ENABLED && (
              <ChatbotTab
                campaigns={campaigns}
                employees={AVAILABLE_EMPLOYEES}
                templates={globalTemplates}
                statusFilter={chatbotStatusFilter}
              />
            )}
          </div>
        </div>
      </div>

      {/* Template Row Actions Menu */}
      {openMenuTemplateId && templateMenuPos && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpenMenuTemplateId(null)} />
          {(() => {
            const tpl = globalTemplates.find(t => t.id === openMenuTemplateId);
            if (!tpl) return null;
            return (
              <div className="absolute w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                style={{ top: templateMenuPos.top, left: templateMenuPos.left, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <button
                  onClick={() => { handleEditTemplate(tpl); setTemplatesView("builder"); setOpenMenuTemplateId(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-blue-500" /> Edit
                </button>
                {tpl.approvalStatus !== "approved" ? (
                  <button
                    onClick={() => { setApprovingTemplate(tpl); setShowApprovalModal(true); setOpenMenuTemplateId(null); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-green-50 text-left text-sm text-green-700 font-semibold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" /> Get Approved
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                    <Check className="w-4 h-4 text-green-500" /> Already Approved
                  </div>
                )}
                <div className="border-t border-gray-100" />
                <button
                  onClick={() => { handleDeleteTemplate(tpl.id); setOpenMenuTemplateId(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-red-50 text-left text-sm text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            );
          })()}
        </>,
        document.body
      )}

      {/* Campaign Row Actions Menu */}
      {openMenuCampaignId && menuPos && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpenMenuCampaignId(null)} />
          {(() => {
            const campaign = campaigns.find(c => c.id === openMenuCampaignId);
            if (!campaign) return null;
            return (
              <div className="absolute w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                style={{ top: menuPos.top, left: menuPos.left, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <button onClick={() => handleOpenView(campaign)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Eye className="w-4 h-4" />View Overview
                </button>
                <button onClick={() => { setOpenMenuCampaignId(null); handleOpenEdit(campaign); handleTabChange("campaigns"); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Pencil className="w-4 h-4" />Edit Campaign
                </button>
                {LEGACY_CHATBOT_MODULE_ENABLED && (
                  <button onClick={() => { setOpenMenuCampaignId(null); setSharingCampaign(campaign); setShowShareModal(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Share2 className="w-4 h-4" />Share
                  </button>
                )}
                {(campaign.status === "active" || campaign.status === "paused") && (
                  <button onClick={() => { handleToggleCampaign(campaign.id); setOpenMenuCampaignId(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {campaign.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {campaign.status === "active" ? "Pause" : "Resume"}
                  </button>
                )}
                <button onClick={() => { handleDeleteCampaign(campaign.id); setOpenMenuCampaignId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Trash2 className="w-4 h-4" />Delete
                </button>
              </div>
            );
          })()}
        </>,
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
              <Button variant="primary" size="sm" onClick={() => { setViewDrawerOpen(false); handleOpenEdit(viewingCampaign); handleTabChange("campaigns"); }}>
                <Pencil className="w-4 h-4" />Edit Campaign
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modals & Live Simulator Drawer */}
      {LEGACY_CHATBOT_MODULE_ENABLED && (
        <AssignChatbotModal
          isOpen={showAssignBotModal}
          onClose={() => setShowAssignBotModal(false)}
          channel={activeConversation?.channel || "whatsapp"}
          assignedPersonId={activeConversation?.assignedPersonId}
          assignedBotId={activeConversation?.assignedBotId}
          onAssign={handleAssignBot}
        />
      )}

      {LEGACY_CHATBOT_MODULE_ENABLED && (
        <EnrollCampaignModal
          isOpen={showEnrollCampaignModal}
          onClose={() => setShowEnrollCampaignModal(false)}
          onEnroll={handleEnrollCampaign}
        />
      )}

      {LEGACY_CHATBOT_MODULE_ENABLED && (
        <TestAsContactDrawer
          isOpen={showTestContactDrawer}
          onClose={() => setShowTestContactDrawer(false)}
          conversation={activeConversation || null}
          bot={(() => {
            if (!activeConversation?.assignedBotId) return undefined;
            try {
              const raw = localStorage.getItem("chatbotBots");
              if (raw) {
                const sanitizeBot = (b: any) => ({ ...b, channels: (b.channels || []).filter((c: string) => c !== "sms") });
                const bots = JSON.parse(raw).map(sanitizeBot);
                return bots.find((b: any) => b.id === activeConversation.assignedBotId);
              }
            } catch { }
            return undefined;
          })()}
          onUpdateConversation={(updated) => {
            setConversations((prev) => prev.map((c) => (c.id === updated.id ? (updated as Conversation) : c)));
          }}
        />
      )}

      {LEGACY_CHATBOT_MODULE_ENABLED && (
        <CampaignShareModal
          isOpen={showShareModal}
          onClose={() => { setShowShareModal(false); setSharingCampaign(null); }}
          campaign={sharingCampaign}
          initialSelectedIds={sharingCampaign?.audienceClientIds || []}
          onShare={(payload) => sharingCampaign && handleShareCampaign(sharingCampaign, payload)}
        />
      )}

      <TemplateLibraryDrawer
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleUseLibraryTemplate}
      />

      <RequestTemplateApprovalModal
        isOpen={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setApprovingTemplate(null); }}
        template={approvingTemplate}
        onSubmit={handleTemplateApprovalSubmit}
      />

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
        guideUrl="/guide/chats"
      />
    </div>
  );
}
