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
  Sparkles,
  Inbox,
  Phone,
  Sliders,
  Palette,
  PhoneCall,
  Code,
  Layers,
  Mail,
  RefreshCw,
  FileEdit,
  AlertOctagon,
} from "lucide-react";
import TemplateLibraryDrawer from "../components/chats/TemplateLibraryDrawer";
import DrawerShell from "../components/ui/DrawerShell";
import { LibraryTemplate } from "../../lib/templateLibrary";
import { useWhatsappTemplates } from "../../lib/useWhatsappTemplates";
import TableComponent, { TableColumn, TableRowAction, TableBulkAction } from "../components/ui/TableComponent";
import { useConversations, Message as ConvMessage, Conversation as ConvConversation, computeSessionWindow } from "../../lib/useConversations";
import ConversationHeader from "../components/chats/ConversationHeader";
import MessageThreadList from "../components/chats/MessageThreadList";
import MessageComposerBar from "../components/chats/MessageComposerBar";
import WebmailView, { EmailFolder } from "../components/chats/WebmailView";
import EmailTemplateDrawer, { EmailTemplate } from "../components/chats/EmailTemplateDrawer";
import EmailBlacklistDrawer from "../components/chats/EmailBlacklistDrawer";
import MailboxIntegrationDrawer from "../components/chats/MailboxIntegrationDrawer";
export type Message = ConvMessage;
export type Conversation = ConvConversation;
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { useSidebar } from "../context/SidebarContext";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import AssignChatbotModal from "../components/chats/AssignChatbotModal";
import AssignResponsibleModal from "../components/chats/AssignResponsibleModal";
import EnrollCampaignModal from "../components/chats/EnrollCampaignModal";
import CampaignShareModal from "../components/chats/CampaignShareModal";
import { getClientList } from "../../lib/getClientList";
import TestProcessChatDrawer from "../components/process/TestProcessChatDrawer";
import { useProcessStore } from "../../lib/useProcessStore";
import { TEST_CHAT_SYNC_EVENT } from "../../lib/testConversationSync";
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
import WebsiteWidgetSettingsTab from "../components/chats/WebsiteWidgetSettingsTab";
import CompanionSettingsTab from "../components/chats/CompanionSettingsTab";
import TestWebsiteChatDrawer from "../components/chats/TestWebsiteChatDrawer";
import { CHANNEL_LABELS, CHANNEL_CLASSES } from "../../constants/channels";
import { getStoredWhatsAppNumbers, DEFAULT_MOCK_NUMBERS } from "../../lib/useWhatsAppNumbers";

// Types are imported from useConversations

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

function formatChatTimestamp(ts?: string) {
  if (!ts) return "";
  if (ts.includes("T") && (ts.endsWith("Z") || ts.includes("+") || ts.includes("-"))) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch {}
  }
  return ts;
}

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
  const { setCollapsed } = useSidebar();

  // Auto-collapse navigation sidebar to rail mode on opening chats module
  useEffect(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  const TAB_ORDER = ["chats", "campaigns", "templates", "chatbot"] as const;
  type TabKey = typeof TAB_ORDER[number];
  const [activeTab, setActiveTab] = useState<TabKey>("chats");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const actionParam = params.get("action");
    if (tabParam === "templates") {
      setActiveTab("templates");
      if (actionParam === "create") {
        handleCreateNewTemplate();
      }
    }
    else if (tabParam === "campaigns") setActiveTab("campaigns");
    else if (tabParam === "chatbot" && LEGACY_CHATBOT_MODULE_ENABLED) setActiveTab("chatbot");
    else setActiveTab("chats");
  }, [location.search]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    navigate(`/chats?tab=${tab}`, { replace: true });
  };

  // ── Chats State ──
  const { conversations, setConversations, sendMessage: storeSendMessage, sendTemplate: storeSendTemplate } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string>("conv-1");
  const [chatSearch, setChatSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "sms" | "website" | "email" | "companion" | null>("whatsapp");
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [numberFilter, setNumberFilter] = useState<string>("");

  useEffect(() => {
    const state = location.state as {
      clientId?: string;
      threadId?: string;
      phone?: string;
      contactName?: string;
      channel?: string;
    } | null;

    if (state && conversations.length > 0) {
      let matchedConv = null;

      if (state.threadId) {
        matchedConv = conversations.find((c) => c.id === state.threadId);
      }

      if (!matchedConv && state.clientId) {
        matchedConv = conversations.find((c: any) => c.clientId === state.clientId);
      }

      if (!matchedConv && state.contactName) {
        const targetName = state.contactName.trim().toLowerCase();
        matchedConv = conversations.find((c) => c.contactName.trim().toLowerCase() === targetName);
      }

      if (!matchedConv && state.phone) {
        const targetClean = state.phone.replace(/\D/g, "");
        if (targetClean) {
          matchedConv = conversations.find((c) => c.phoneNumber.replace(/\D/g, "") === targetClean);
        }
      }

      if (!matchedConv && state.clientId) {
        try {
          const rawClients = sessionStorage.getItem("clients");
          const clientList = rawClients ? JSON.parse(rawClients) : [];
          const client = clientList.find((c: any) => c.id === state.clientId);
          if (client) {
            const cleanPhone = (client.phone || client.phoneNumber || "").replace(/\D/g, "");
            matchedConv = conversations.find(
              (c) =>
                (client.name && c.contactName.toLowerCase() === client.name.toLowerCase()) ||
                (cleanPhone && c.phoneNumber.replace(/\D/g, "") === cleanPhone)
            );
          }
        } catch {}
      }

      if (matchedConv) {
        setSelectedConversationId(matchedConv.id);
        if (matchedConv.channel) {
          setChannelFilter(matchedConv.channel as any);
        }
      }
    }
  }, [location.state, conversations]);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "active" | "draft" | "completed">("all");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<"all" | "Marketing" | "Utility" | "Authentication">("all");
  const [chatbotStatusFilter, setChatbotStatusFilter] = useState<"all" | "active" | "inactive">("all");
  type ViewFilter = "all" | "open" | "resolved" | "unread" | "assigned_to_me";
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [showTestWebsiteDrawer, setShowTestWebsiteDrawer] = useState(false);
  const [showViewFilterDropdown, setShowViewFilterDropdown] = useState(false);
  const [showNumberFilterDropdown, setShowNumberFilterDropdown] = useState(false);
  const [isListPaneCollapsed, setIsListPaneCollapsed] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [showUseTemplateDropdown, setShowUseTemplateDropdown] = useState(false);
  const [showComposerGearMenu, setShowComposerGearMenu] = useState(false);
  const [assignAgentMenuOpen, setAssignAgentMenuOpen] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const numberDropdownRef = useRef<HTMLDivElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);
  const viewFilterDropdownRef = useRef<HTMLDivElement>(null);
  const [activeEmailFolder, setActiveEmailFolder] = useState<EmailFolder>("inbox");
  const [emailUnreadCount, setEmailUnreadCount] = useState<number>(7);
  const [showEmailFolderDropdown, setShowEmailFolderDropdown] = useState(false);
  const emailFolderDropdownRef = useRef<HTMLDivElement>(null);
  const [showEmailGearMenu, setShowEmailGearMenu] = useState(false);
  const emailGearMenuRef = useRef<HTMLDivElement>(null);
  const [emailTemplateSearch, setEmailTemplateSearch] = useState("");
  const [showEmailTemplateDrawer, setShowEmailTemplateDrawer] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);
  const [selectedEmailTemplateIds, setSelectedEmailTemplateIds] = useState<Set<string>>(new Set());

  const [showBlacklistDrawer, setShowBlacklistDrawer] = useState(false);
  const [showMailboxIntegrationDrawer, setShowMailboxIntegrationDrawer] = useState(false);

  useEffect(() => {
    const handleOpenMailbox = () => setShowMailboxIntegrationDrawer(true);
    const handleOpenBlacklist = () => setShowBlacklistDrawer(true);
    window.addEventListener("open-mailbox-integration-settings", handleOpenMailbox);
    window.addEventListener("open-webmail-blacklist", handleOpenBlacklist);
    return () => {
      window.removeEventListener("open-mailbox-integration-settings", handleOpenMailbox);
      window.removeEventListener("open-webmail-blacklist", handleOpenBlacklist);
    };
  }, []);

  const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
    {
      id: "em-tpl-1",
      name: "Appointment Confirmation & Prep",
      subject: "Your Appointment Confirmation with {{doctor_name}} - Mantra Care",
      category: "Appointment Reminder",
      preheader: "Details and preparation instructions for your upcoming appointment.",
      bodyText:
        "Hi {{client_name}},\n\nYour upcoming consultation has been confirmed for {{appointment_date}} at {{appointment_time}} with Dr. {{doctor_name}} at {{clinic_name}}.\n\nPlease arrive 10 minutes prior to your scheduled time or test your camera and microphone for video consultation.\n\nWarm regards,\n{{clinic_name}} Care Team",
      lastModified: "Today at 10:15 AM",
      createdAt: "2026-10-15",
    },
    {
      id: "em-tpl-2",
      name: "Post-Consultation Care Plan & Follow-Up",
      subject: "Summary & Next Steps Following Your Consultation - {{client_name}}",
      category: "Follow-up",
      preheader: "Your personalized treatment summary and follow-up guidelines.",
      bodyText:
        "Hello {{client_name}},\n\nThank you for meeting with Dr. {{doctor_name}} today. Attached is a summary of your treatment plan and prescribed recommendations.\n\nIf you have any questions or experience symptoms, please reply to this email or book your follow-up slot.\n\nBest regards,\nMantra Care Clinical Team",
      lastModified: "Oct 20 at 3:45 PM",
      createdAt: "2026-10-18",
    },
    {
      id: "em-tpl-3",
      name: "New Client Welcome & Medical Intake",
      subject: "Welcome to Mantra Care! Please Complete Your Health Intake",
      category: "Welcome / Onboarding",
      preheader: "Complete your online medical profile before your first visit.",
      bodyText:
        "Welcome to Mantra Care, {{client_name}}!\n\nTo help us prepare for your upcoming visit, please log in to your patient portal and complete your digital medical history form.\n\nPortal Link: {{portal_url}}\n\nSincerely,\nClient Experience Team",
      lastModified: "Oct 18 at 9:00 AM",
      createdAt: "2026-10-12",
    },
    {
      id: "em-tpl-4",
      name: "Itemized Invoice & Payment Receipt",
      subject: "Receipt for Your Recent Visit - Mantra Care",
      category: "Billing",
      preheader: "Payment confirmation and itemized superbill for your records.",
      bodyText:
        "Dear {{client_name}},\n\nThank you for your payment for services rendered on {{appointment_date}} with {{doctor_name}}.\n\nA copy of your itemized superbill and payment receipt is attached for your insurance records.\n\nBilling Department\nMantra Care",
      lastModified: "Oct 15 at 1:30 PM",
      createdAt: "2026-10-10",
    },
    {
      id: "em-tpl-5",
      name: "Annual Preventive Health Checkup",
      subject: "Time for Your Annual Health Assessment, {{client_name}}",
      category: "Clinical Care",
      preheader: "Schedule your routine wellness exam with Mantra Care.",
      bodyText:
        "Hi {{client_name}},\n\nOur records show it is time for your annual routine health checkup. Regular preventive evaluations are essential for proactive health management.\n\nPlease reply or visit {{portal_url}} to choose a convenient date.\n\nStay well,\nMantra Care",
      lastModified: "Oct 12 at 11:20 AM",
      createdAt: "2026-10-05",
    },
  ];

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const stored = localStorage.getItem("emailTemplates");
      return stored ? JSON.parse(stored) : DEFAULT_EMAIL_TEMPLATES;
    } catch {
      return DEFAULT_EMAIL_TEMPLATES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("emailTemplates", JSON.stringify(emailTemplates));
    } catch {}
  }, [emailTemplates]);

  const filteredEmailTemplates = useMemo(() => {
    if (!emailTemplateSearch.trim()) return emailTemplates;
    const q = emailTemplateSearch.toLowerCase().trim();
    return emailTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.preheader && t.preheader.toLowerCase().includes(q)) ||
        t.bodyText.toLowerCase().includes(q)
    );
  }, [emailTemplates, emailTemplateSearch]);

  const handleSaveEmailTemplate = (saved: EmailTemplate) => {
    setEmailTemplates((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
    setShowEmailTemplateDrawer(false);
    setEditingEmailTemplate(null);
  };

  const handleDeleteEmailTemplate = (id: string) => {
    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Email template deleted");
  };

  const handleDuplicateEmailTemplate = (tpl: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...tpl,
      id: `em-tpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      lastModified: "Just now",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setEmailTemplates((prev) => [duplicated, ...prev]);
    toast.success(`Duplicated "${tpl.name}"`);
  };

  const emailTemplateColumns: TableColumn<EmailTemplate>[] = [
    {
      id: "name",
      header: "NAME",
      align: "left",
      render: (tpl) => (
        <button
          type="button"
          onClick={() => {
            setEditingEmailTemplate(tpl);
            setShowEmailTemplateDrawer(true);
          }}
          className="text-xs font-bold text-[#1E293B] hover:text-[#1456f0] transition-colors text-left cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {tpl.name}
        </button>
      ),
    },
    {
      id: "subject",
      header: "SUBJECT LINE",
      align: "left",
      render: (tpl) => (
        <span className="text-xs font-medium text-slate-700 line-clamp-1 max-w-[360px]" title={tpl.subject}>
          {tpl.subject}
        </span>
      ),
    },
    {
      id: "category",
      header: "CATEGORY",
      align: "left",
      render: (tpl) => (
        <span className="text-xs text-slate-700 font-medium">
          {tpl.category}
        </span>
      ),
    },
    {
      id: "lastModified",
      header: "LAST MODIFIED",
      align: "left",
      render: (tpl) => (
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {tpl.lastModified}
        </span>
      ),
    },
  ];

  const emailTemplateRowActions: TableRowAction<EmailTemplate>[] = [
    {
      label: "Edit Template",
      icon: <Pencil className="w-3.5 h-3.5 text-blue-500" />,
      onClick: (tpl) => {
        setEditingEmailTemplate(tpl);
        setShowEmailTemplateDrawer(true);
      },
    },
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5 text-slate-500" />,
      onClick: (tpl) => handleDuplicateEmailTemplate(tpl),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: (tpl) => handleDeleteEmailTemplate(tpl.id),
    },
  ];

  const emailTemplateBulkActions: TableBulkAction[] = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: (selectedIds) => {
        setEmailTemplates((prev) => prev.filter((t) => !selectedIds.has(t.id)));
        setSelectedEmailTemplateIds(new Set());
        toast.success(`Deleted ${selectedIds.size} template(s)`);
      },
    },
  ];

  const { processes, getWorkflowStepsForStage } = useProcessStore();
  const [showAssignBotModal, setShowAssignBotModal] = useState(false);
  const [showEnrollCampaignModal, setShowEnrollCampaignModal] = useState(false);
  const [showTestProcessDrawer, setShowTestProcessDrawer] = useState(false);
  const [showWebsiteSettingsDrawer, setShowWebsiteSettingsDrawer] = useState(false);
  const [showCompanionSettingsDrawer, setShowCompanionSettingsDrawer] = useState(false);
  const widgetSettingsSaveRef = useRef<(() => void) | null>(null);
  const companionSaveRef = useRef<(() => void) | null>(null);

  const handleChannelChange = (channel: "whatsapp" | "sms" | "website" | "email" | "companion") => {
    setChannelFilter(channel);
    setShowChannelDropdown(false);
    setActiveTab("chats");
  };

  const handleSubModeChange = (mode: "inbox" | "templates") => {
    if (mode === "inbox") {
      setActiveTab("chats");
    } else if (mode === "templates") {
      setActiveTab("templates");
    }
  };

  const subMode = useMemo(() => {
    if ((channelFilter === "whatsapp" || channelFilter === "email") && activeTab === "templates") return "templates";
    return "inbox";
  }, [channelFilter, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowComposerGearMenu(false);
        setShowUseTemplateDropdown(false);
        setAssignAgentMenuOpen(false);
        setShowNumberFilterDropdown(false);
        setShowChannelDropdown(false);
        setShowViewFilterDropdown(false);
        setShowEmailGearMenu(false);
        setShowEmailFolderDropdown(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setShowComposerGearMenu(false);
        setAssignAgentMenuOpen(false);
      }
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(e.target as Node)) {
        setShowChannelDropdown(false);
      }
      if (numberDropdownRef.current && !numberDropdownRef.current.contains(e.target as Node)) {
        setShowNumberFilterDropdown(false);
      }
      if (viewFilterDropdownRef.current && !viewFilterDropdownRef.current.contains(e.target as Node)) {
        setShowViewFilterDropdown(false);
      }
      if (emailGearMenuRef.current && !emailGearMenuRef.current.contains(e.target as Node)) {
        setShowEmailGearMenu(false);
      }
      if (emailFolderDropdownRef.current && !emailFolderDropdownRef.current.contains(e.target as Node)) {
        setShowEmailFolderDropdown(false);
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

  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem("whatsappMockConversations");
        if (stored) setConversations(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener(TEST_CHAT_SYNC_EVENT, handler);
    return () => window.removeEventListener(TEST_CHAT_SYNC_EVENT, handler);
  }, []);

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
      if (state.channel === "whatsapp" || state.channel === "sms" || state.channel === "website" || state.channel === "email") {
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

  const handleAssignPerson = (personId: string, personName: string) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? {
              ...c,
              assignedPersonId: personId,
              botStatus: personId ? "off" : c.botStatus,
            }
          : c
      )
    );
    toast.success(personId ? `Assigned to ${personName}` : "Conversation unassigned");
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
    storeSendTemplate(selectedConversationId, template);
    toast.success(`Template "${template.name}" sent`);
  };

  const handleSendMessage = () => {
    if (!composerText.trim() || !activeConversation) return;
    storeSendMessage(selectedConversationId, composerText);
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
    if (channelFilter === "email") {
      const convEmails = conversations.filter((c) => c.channel === "email" && c.inboxNumber).map((c) => c.inboxNumber!);
      return Array.from(new Set(["navodya@mantra.care", ...convEmails, "support@mantracare.com"]));
    }
    if (channelFilter === "companion") {
      return ["Companion Portal"];
    }
    return [];
  }, [channelFilter, conversations]);

  useEffect(() => {
    if (availableNumbersForChannel.length > 0) {
      if (!numberFilter || !availableNumbersForChannel.includes(numberFilter)) {
        setNumberFilter(availableNumbersForChannel[0]);
      }
    } else {
      setNumberFilter("");
    }
  }, [availableNumbersForChannel, numberFilter]);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) || c.phoneNumber.includes(chatSearch) || c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
    const matchesChannel = channelFilter === null ? false : channelFilter === "all" ? true : c.channel === channelFilter;
    const matchesView =
      viewFilter === "all" ? true :
        viewFilter === "unread" ? c.unreadCount > 0 :
          viewFilter === "assigned_to_me" ? c.assignedPersonId === CURRENT_USER_ID :
            c.status === viewFilter;
    const matchesNumber = true; // Show all contacts in the contact list
    return matchesSearch && matchesChannel && matchesView && matchesNumber;
  });

  useEffect(() => {
    if (filteredConversations.length > 0) {
      const exists = filteredConversations.some(c => c.id === selectedConversationId);
      if (!exists) {
        setSelectedConversationId(filteredConversations[0].id);
      }
    }
  }, [filteredConversations, selectedConversationId]);

  // ── Templates State ──
  const [globalTemplates, setGlobalTemplates] = useWhatsappTemplates();
  const [templateSearch, setTemplateSearch] = useState("");
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return globalTemplates;
    const q = templateSearch.toLowerCase().trim();
    return globalTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.identifier.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.bodyText.toLowerCase().includes(q)
    );
  }, [globalTemplates, templateSearch]);

  // ── Website Widget Settings Search & Quick Jump State ──
  const [widgetSettingsSearch, setWidgetSettingsSearch] = useState("");

  const WIDGET_SETTINGS_ITEMS = useMemo(() => [
    {
      id: "setting-position",
      title: "Widget Position",
      category: "Appearance & Layout",
      description: "Screen anchor alignment (bottom-right, bottom-left, top corners, centers)",
      keywords: ["position", "anchor", "bottom", "left", "right", "top", "align", "corner"],
      icon: <Sliders className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-theme",
      title: "Theme & Colors",
      category: "Appearance & Layout",
      description: "Primary brand accent color palette and Light/Dark mode switcher",
      keywords: ["theme", "color", "accent", "primary", "palette", "dark", "light", "mode", "hex"],
      icon: <Palette className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-launcher-icon",
      title: "Branding & Header",
      category: "Appearance & Layout",
      description: "Bot name, greeting header and white-label signature toggle",
      keywords: ["branding", "name", "bot", "brand", "header", "signature", "white-label", "powered by"],
      icon: <Bot className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-working-hours",
      title: "Working Time Preferences",
      category: "Appearance & Layout",
      description: "Show widget during business work hours synced with location schedules",
      keywords: ["hours", "working", "schedule", "time", "location", "operating", "days", "timezone"],
      icon: <Clock className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-intake-form",
      title: "Pre-Chat Intake Form",
      category: "Appearance & Layout",
      description: "Name, email, phone, requirement dropdown and CRM client auto-creation mapping",
      keywords: ["intake", "form", "pre-chat", "fields", "requirement", "process", "client", "mapping", "phone", "email"],
      icon: <Layers className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-first-responder",
      title: "First Responder",
      category: "Chat Routing & Queue",
      description: "Choose whether AI Assistant or Human Agent responds first to visitor inquiries",
      keywords: ["first", "responder", "ai", "human", "agent", "assistant", "bot", "routing", "priority"],
      icon: <ShieldCheck className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-agent-queue",
      title: "Queue & Routing & Public Profiles",
      category: "Chat Routing & Queue",
      description: "Assign team members to queue and configure public display names, avatars & titles",
      keywords: ["queue", "agent", "employee", "team", "assign", "routing", "profile", "avatar", "title", "position"],
      icon: <Users className="w-4 h-4 text-[#1456f0]" />,
    },
    {
      id: "setting-embed-code",
      title: "Widget Embed Code",
      category: "Installation & Embed",
      description: "HTML script tag snippet for instant website installation",
      keywords: ["embed", "code", "script", "install", "html", "snippet", "javascript", "integration"],
      icon: <Code className="w-4 h-4 text-[#1456f0]" />,
    },
  ], []);

  const filteredWidgetSettings = useMemo(() => {
    if (!widgetSettingsSearch.trim()) return WIDGET_SETTINGS_ITEMS;
    const q = widgetSettingsSearch.toLowerCase().trim();
    return WIDGET_SETTINGS_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [WIDGET_SETTINGS_ITEMS, widgetSettingsSearch]);

  const handleJumpToSetting = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#1456f0]", "transition-all");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#1456f0]");
      }, 2500);
    }
  };
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templatesView, setTemplatesView] = useState<"table" | "builder">("table");
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [showVarMapping, setShowVarMapping] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [templateForm, setTemplateForm] = useState<Omit<WhatsappTemplate, "id" | "createdAt">>({
    name: "", identifier: "", category: "Marketing", language: "English",
    header: { type: "none", content: "" }, bodyText: "", footerText: "", buttons: [], variableMappings: {},
    headerType: "none", headerText: "", headerMediaUrl: "", headerFileName: "",
  });

  const mediaTypes = ["image", "video", "document"] as const;
  const acceptForHeaderType =
    templateForm.headerType === "image"
      ? ".png,.jpg,.jpeg"
      : templateForm.headerType === "video"
      ? ".mp4"
      : ".pdf,.doc,.docx";

  const handleFileDrop = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setTemplateForm(prev => ({ ...prev, headerMediaUrl: objectUrl, headerFileName: file.name }));
  };

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
      approvalStatus: "approved",
      metaTemplateId: `LIB_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
    };

    setGlobalTemplates(prev => [...prev, newTemplate]);
    handleEditTemplate(newTemplate);
    setShowTemplateDrawer(true);
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
    setShowTemplateDrawer(true);
    setShowVarMapping(false);
  };

  const handleEditTemplate = (tpl: WhatsappTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateForm({ name: tpl.name, identifier: tpl.identifier, category: tpl.category, language: tpl.language, header: tpl.header || { type: "none", content: "" }, bodyText: tpl.bodyText, footerText: tpl.footerText || "", buttons: tpl.buttons || [], variableMappings: tpl.variableMappings || {}, headerType: tpl.headerType || "none", headerText: tpl.headerText || "", headerMediaUrl: tpl.headerMediaUrl || "", headerFileName: tpl.headerFileName || "", approvalStatus: tpl.approvalStatus || "pending", metaTemplateId: tpl.metaTemplateId, submittedAt: tpl.submittedAt, reviewedAt: tpl.reviewedAt, rejectionReason: tpl.rejectionReason });
    setShowTemplateDrawer(true);
    setShowVarMapping(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setGlobalTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted successfully");
      if (editingTemplateId === id) { setShowTemplateDrawer(false); setEditingTemplateId(null); }
    }
  };

  const handleSaveTemplate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateForm.name.trim()) { toast.error("Template name is required"); return; }
    if (!templateForm.identifier.trim()) { toast.error("Template identifier is required"); return; }
    if (!templateForm.bodyText.trim()) { toast.error("Template body text is required"); return; }
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
    setShowTemplateDrawer(false);
    setEditingTemplateId(null);
  };

  // ── Action Dropdowns Position State & Refs ──
  const [openMenuCampaignId, setOpenMenuCampaignId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const campaignTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());

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
    if (!openMenuCampaignId) return;
    const handleScroll = () => {
      setOpenMenuCampaignId(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [openMenuCampaignId]);

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
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Chats"
          subtitle="Message clients over WhatsApp, SMS, and Website, and manage templates & settings"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Omnichannel
            </span>
          }
        >
          <button
            type="button"
            onClick={() => {
              if (channelFilter === "website") {
                setShowTestWebsiteDrawer(true);
              } else {
                setShowTestProcessDrawer(true);
              }
            }}
            className="text-[11px] font-mono font-medium text-slate-400 hover:text-slate-800 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-100/80 cursor-pointer"
            title="Open Test Simulator"
          >
            (dev)
          </button>
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Chats Works" />
        </PageHeader>

        {/* ── Official PageTopBar matching DESIGN.md & other pages ── */}
        <PageTopBar
          leftElement={
            <div className="flex items-center gap-2">
              {/* Channel Dropdown: WhatsApp, SMS, Website, Email */}
              <div className="relative shrink-0" ref={channelDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChannelDropdown((prev) => !prev);
                    setShowNumberFilterDropdown(false);
                    setShowViewFilterDropdown(false);
                  }}
                  className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-bold text-[#1E293B] flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  title="Select Channel"
                >
                  {channelFilter === "whatsapp" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#25D366]" />
                      <Phone className="w-3.5 h-3.5 text-[#128C7E]" />
                      <span className="text-[#128C7E] font-bold">WhatsApp</span>
                    </div>
                  )}
                  {channelFilter === "sms" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-[#10B981] font-bold">SMS</span>
                    </div>
                  )}
                  {channelFilter === "website" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                      <Globe className="w-3.5 h-3.5 text-[#6366F1]" />
                      <span className="text-[#6366F1] font-bold">Website</span>
                    </div>
                  )}
                  {channelFilter === "email" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                      <Mail className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span className="text-[#0284C7] font-bold">Email</span>
                    </div>
                  )}
                  {channelFilter === "companion" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <Bot className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span className="text-[#2563EB] font-bold">Companion</span>
                    </div>
                  )}
                  {channelFilter === "all" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-slate-700 font-bold">All Channels</span>
                    </div>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform ${
                      showChannelDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showChannelDropdown && (
                  <div
                    className="absolute left-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-xl z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleChannelChange("whatsapp")}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                        channelFilter === "whatsapp" ? "text-[#128C7E] font-bold bg-emerald-50/60" : "text-[#1E293B]"
                      }`}
                    >
                      <span>WhatsApp</span>
                      {channelFilter === "whatsapp" && <Check className="w-3.5 h-3.5 text-[#128C7E]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelChange("sms")}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                        channelFilter === "sms" ? "text-[#10B981] font-bold bg-emerald-50/60" : "text-[#1E293B]"
                      }`}
                    >
                      <span>SMS</span>
                      {channelFilter === "sms" && <Check className="w-3.5 h-3.5 text-[#10B981]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelChange("website")}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                        channelFilter === "website" ? "text-[#6366F1] font-bold bg-indigo-50/60" : "text-[#1E293B]"
                      }`}
                    >
                      <span>Website</span>
                      {channelFilter === "website" && <Check className="w-3.5 h-3.5 text-[#6366F1]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelChange("email")}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                        channelFilter === "email" ? "text-[#0284C7] font-bold bg-sky-50/60" : "text-[#1E293B]"
                      }`}
                    >
                      <span>Email</span>
                      {channelFilter === "email" && <Check className="w-3.5 h-3.5 text-[#0284C7]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChannelChange("companion")}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                        channelFilter === "companion" ? "text-[#2563EB] font-bold bg-blue-50/60" : "text-[#1E293B]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Companion</span>
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-700">Client</span>
                      </div>
                      {channelFilter === "companion" && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-modes: Inbox vs Templates for WhatsApp only */}
              {channelFilter === "whatsapp" && (
                <div className="inline-flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleSubModeChange("inbox")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      subMode === "inbox"
                        ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                        : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>Inbox</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubModeChange("templates")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      subMode === "templates"
                        ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                        : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>Templates</span>
                  </button>
                </div>
              )}

              {/* Clean Gear Settings Button for Website and Companion */}
              {(channelFilter === "website" || channelFilter === "companion") && (
                <button
                  type="button"
                  onClick={() => {
                    if (channelFilter === "website") setShowWebsiteSettingsDrawer(true);
                    else setShowCompanionSettingsDrawer(true);
                  }}
                  className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  title={channelFilter === "website" ? "Website Widget Settings" : "Companion Settings"}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Settings</span>
                </button>
              )}

              {/* Phone Number Selector: For WhatsApp and SMS */}
              {subMode === "inbox" && (channelFilter === "whatsapp" || channelFilter === "sms") && (
                <div className="relative shrink-0" ref={numberDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNumberFilterDropdown((prev) => !prev);
                      setShowViewFilterDropdown(false);
                      setShowChannelDropdown(false);
                    }}
                    className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer font-mono tabular-nums"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title="Select phone number"
                  >
                    <span className="truncate max-w-[140px]">
                      {numberFilter || availableNumbersForChannel[0] || "Select Number"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform ${
                        showNumberFilterDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showNumberFilterDropdown && (
                    <div
                      className="absolute left-0 mt-1 w-56 bg-white border border-border rounded-xl shadow-xl z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 font-mono tabular-nums"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {availableNumbersForChannel.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setNumberFilter(num);
                            setShowNumberFilterDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                            (numberFilter || availableNumbersForChannel[0]) === num
                              ? "text-[#1456f0] font-bold bg-blue-50/60"
                              : "text-[#1E293B]"
                          }`}
                        >
                          <span>{num}</span>
                          {(numberFilter || availableNumbersForChannel[0]) === num && (
                            <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Email Channel Navigation: First ask Mail vs Templates, then ask for account & folders if Mail */}
              {channelFilter === "email" && (
                <>
                  <div className="inline-flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSubModeChange("inbox")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                        subMode === "inbox"
                          ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                          : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span>Mail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubModeChange("templates")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                        subMode === "templates"
                          ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                          : "text-slate-500 hover:text-[#1E293B] hover:bg-white/50"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span>Templates</span>
                    </button>
                  </div>

                  {/* If Mail is selected, ask to choose account, sync button & folders dropdown */}
                  {subMode === "inbox" && (
                    <>
                      <div className="relative shrink-0" ref={numberDropdownRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNumberFilterDropdown((prev) => !prev);
                            setShowEmailFolderDropdown(false);
                            setShowViewFilterDropdown(false);
                            setShowChannelDropdown(false);
                          }}
                          className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer font-mono tabular-nums"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          title="Select Mailbox"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span className="truncate max-w-[170px]">
                            {numberFilter || availableNumbersForChannel[0] || "navodya@mantra.care"}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform ${
                              showNumberFilterDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {showNumberFilterDropdown && (
                          <div
                            className="absolute left-0 mt-1 w-64 bg-white border border-border rounded-xl shadow-xl z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 font-mono tabular-nums"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {availableNumbersForChannel.map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setNumberFilter(num);
                                  setShowNumberFilterDropdown(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                                  (numberFilter || availableNumbersForChannel[0]) === num
                                    ? "text-[#1456f0] font-bold bg-blue-50/60"
                                    : "text-[#1E293B]"
                                }`}
                              >
                                <span className="truncate">{num}</span>
                                {(numberFilter || availableNumbersForChannel[0]) === num && (
                                  <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Folder Dropdown: Inbox (default), Drafts, Sent, Spam, Trash */}
                      <div className="relative shrink-0" ref={emailFolderDropdownRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEmailFolderDropdown((prev) => !prev);
                            setShowNumberFilterDropdown(false);
                            setShowChannelDropdown(false);
                            setShowViewFilterDropdown(false);
                          }}
                          className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer capitalize"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          title="Select email folder"
                        >
                          {activeEmailFolder === "inbox" ? (
                            <Inbox className="w-3.5 h-3.5 text-slate-600" />
                          ) : activeEmailFolder === "drafts" ? (
                            <FileEdit className="w-3.5 h-3.5 text-slate-600" />
                          ) : activeEmailFolder === "sent" ? (
                            <Send className="w-3.5 h-3.5 text-slate-600" />
                          ) : activeEmailFolder === "spam" ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-slate-600" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span>
                            {activeEmailFolder === "inbox"
                              ? "Inbox"
                              : activeEmailFolder === "drafts"
                              ? "Drafts"
                              : activeEmailFolder === "sent"
                              ? "Sent"
                              : activeEmailFolder === "spam"
                              ? "Spam"
                              : "Trash"}
                          </span>
                          {activeEmailFolder === "inbox" && emailUnreadCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono tabular-nums bg-[#1E293B] text-white">
                              {emailUnreadCount}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform ${
                              showEmailFolderDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {showEmailFolderDropdown && (
                          <div
                            className="absolute left-0 mt-1 w-44 bg-white border border-border rounded-xl shadow-xl z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {(
                              [
                                { id: "inbox" as const, label: "Inbox" },
                                { id: "drafts" as const, label: "Drafts" },
                                { id: "sent" as const, label: "Sent" },
                                { id: "spam" as const, label: "Spam" },
                                { id: "trash" as const, label: "Trash" },
                              ] as const
                            ).map((f) => {
                              const isSelected = activeEmailFolder === f.id;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveEmailFolder(f.id);
                                    setShowEmailFolderDropdown(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                                    isSelected ? "text-[#1456f0] font-bold bg-blue-50/60" : "text-[#1E293B]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{f.label}</span>
                                    {f.id === "inbox" && emailUnreadCount > 0 && (
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                                          isSelected ? "bg-[#1456f0] text-white" : "bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        {emailUnreadCount}
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          }
          searchQuery={
            channelFilter === "email"
              ? subMode === "templates"
                ? emailTemplateSearch
                : emailSearch
              : subMode === "templates"
              ? templateSearch
              : chatSearch
          }
          onSearchChange={
            channelFilter === "email"
              ? subMode === "templates"
                ? setEmailTemplateSearch
                : setEmailSearch
              : subMode === "templates"
              ? setTemplateSearch
              : setChatSearch
          }
          searchPlaceholder={
            channelFilter === "email"
              ? subMode === "templates"
                ? "Search email templates (name, subject, body)..."
                : "Search emails (from, subject, body)..."
              : subMode === "templates"
              ? "Search templates..."
              : channelFilter === "website"
              ? "Search visitor chats..."
              : channelFilter === "companion"
              ? "Search Companion client chats..."
              : "Search conversations..."
          }
          customFilterModalContent={undefined}
          secondaryActions={
            channelFilter === "email" && subMode === "inbox" ? (
              <button
                type="button"
                onClick={() => toast.success("Mailbox synchronized")}
                className="h-[36px] w-[36px] bg-white hover:bg-slate-50 border border-border rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Synchronize mailbox"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
          primaryAction={
            channelFilter === "email"
              ? subMode === "templates"
                ? {
                    label: "New Template",
                    icon: <Plus className="w-4 h-4" />,
                    onClick: () => {
                      setEditingEmailTemplate(null);
                      setShowEmailTemplateDrawer(true);
                    },
                  }
                : {
                    label: "Compose Email",
                    icon: <Plus className="w-4 h-4" />,
                    onClick: () => {
                      window.dispatchEvent(new CustomEvent("open-webmail-compose"));
                    },
                  }
              : subMode === "templates"
              ? {
                  label: "New Template",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => {
                    handleCreateNewTemplate();
                  },
                }
              : undefined
          }
          afterPrimaryAction={
            channelFilter === "email" && subMode === "inbox" ? (
              <div className="relative shrink-0" ref={emailGearMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowEmailGearMenu((prev) => !prev)}
                  className="w-[36px] h-[36px] rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
                  title="Mailbox Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {showEmailGearMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-gray-200/90 bg-white shadow-xl p-1 z-50 text-xs font-semibold text-[#1E293B] animate-in fade-in zoom-in-95 duration-100"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowBlacklistDrawer(true);
                        setShowEmailGearMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Block list</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-webmail-signatures"));
                        setShowEmailGearMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50/60 text-[#1456f0] transition-colors flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-[#1456f0]" />
                      <span>Edit signature</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("mark-all-webmail-read"));
                        setShowEmailGearMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mark all as read</span>
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMailboxIntegrationDrawer(true);
                        setShowEmailGearMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSubModeChange("inbox");
                        window.dispatchEvent(new CustomEvent("open-webmail-compose"));
                        setShowEmailGearMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open email</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (channelFilter === "website" || channelFilter === "companion") ? (
              <button
                type="button"
                onClick={() => {
                  if (channelFilter === "website") setShowWebsiteSettingsDrawer(true);
                  else setShowCompanionSettingsDrawer(true);
                }}
                className="w-[36px] h-[36px] rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
                title={channelFilter === "website" ? "Website Widget Settings" : "Companion Settings"}
              >
                <Settings className="w-4 h-4" />
              </button>
            ) : undefined
          }
        />

        {/* ── Main Content Area Below Topbar ── */}
        {activeTab === "chats" && (
          channelFilter === "email" ? (
            <WebmailView
              searchQuery={emailSearch}
              activeFolder={activeEmailFolder}
              onFolderChange={setActiveEmailFolder}
              onUnreadCountChange={setEmailUnreadCount}
              onOpenMailboxSettings={() => setShowMailboxIntegrationDrawer(true)}
              onOpenCrmSettings={() => setShowMailboxIntegrationDrawer(true)}
            />
          ) : (
          <div className="flex gap-5 sm:gap-6 h-[calc(100vh-230px)] min-h-[620px]">
            {/* ── Left Side Panel: Contacts List (Separate Div / Card) ── */}
            <div className="w-[330px] sm:w-[360px] shrink-0 bg-white rounded-none border border-gray-200/90 shadow-xs flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {channelFilter === null ? (
                  <div className="p-10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Select a channel
                    </p>
                    <p className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Choose WhatsApp, SMS, or Website to view conversations.
                    </p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    No conversations found.
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = conv.id === selectedConversationId;
                    const assignedPerson = conv.assignedPersonId ? AVAILABLE_EMPLOYEES.find((e) => e.id === conv.assignedPersonId) : null;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={`flex items-start gap-3 p-3.5 cursor-pointer hover:bg-[#F1F5F9] transition-all border-l-2 ${
                          isSelected ? "bg-[#E8F0FE] border-l-[#1456f0]" : "border-l-transparent bg-white"
                        }`}
                      >
                        {/* Profile Initials Avatar without channel icon */}
                        <div
                          className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs ${
                            isSelected ? "bg-[#1E293B] text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {getInitials(conv.contactName)}
                        </div>

                        {/* Middle: Contact Name and Last Message */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4
                              className={`text-sm truncate ${
                                isSelected ? "text-[#1E293B] font-bold" : "text-[#1E293B] font-semibold"
                              }`}
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              {conv.contactName}
                            </h4>
                            {assignedPerson && (
                              <span className="text-[9px] text-[#64748b] font-semibold bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                👤 {getInitials(assignedPerson.name)}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs text-[#64748b] truncate"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {conv.lastMessage}
                          </p>
                        </div>

                        {/* Right: Time on top, pending chats (unread badge) below it */}
                        <div className="flex flex-col items-end shrink-0 gap-1.5 pt-0.5">
                          <span
                            className="text-[10px] text-[#94a3b8] font-mono tabular-nums leading-none"
                            style={{ fontFamily: "JetBrains Mono, monospace" }}
                          >
                            {formatChatTimestamp(conv.timestamp)}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-[#1456f0] text-white text-[10px] font-bold flex items-center justify-center shadow-2xs font-mono tabular-nums">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Right Side Panel: Chat Window (Separate Div / Card) ── */}
            <div className="flex-1 min-w-0 bg-white rounded-none border border-gray-200/90 shadow-xs flex flex-col overflow-hidden">
              {activeConversation ? (
                <>
                  {/* Shared Chat Subcomponents */}
                  <ConversationHeader
                    conversation={activeConversation}
                    onToggleBotStatus={handleToggleBotStatus}
                    onOpenAssignBotModal={() => setShowAssignBotModal(true)}
                    onOpenAssignPersonModal={() => setAssignAgentMenuOpen(true)}
                    availableEmployees={AVAILABLE_EMPLOYEES}
                  />
                  <MessageThreadList
                    messages={activeConversation.messages}
                    emptyMessage="No messages in this conversation yet."
                  />
                  <MessageComposerBar
                    conversation={activeConversation}
                    session={computeSessionWindow(activeConversation)}
                    onSendMessage={handleSendMessage}
                    onSendTemplate={handleSendTemplateDirectly}
                    onEnrollCampaign={handleEnrollCampaign}
                    onAssignResponsible={handleAssignPerson}
                  />
                </>
              ) : (
                <div
                  className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 text-sm"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-600 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Select a conversation
                  </p>
                  <p className="text-xs text-gray-400">Choose a chat from the contact list to view the conversation</p>
                </div>
              )}
            </div>
          </div>
          )
        )}

        {/* ── Tab: WhatsApp or Email Templates (Table View + Side Drawer) ── */}
        {activeTab === "templates" && (
          channelFilter === "email" ? (
            <TableComponent<EmailTemplate>
              className="rounded-2xl border-gray-200/90 shadow-xs"
              data={filteredEmailTemplates}
              columns={emailTemplateColumns}
              getRowId={(tpl) => tpl.id}
              rowActions={emailTemplateRowActions}
              enableSelection={true}
              selectedIds={selectedEmailTemplateIds}
              onSelectionChange={(ids) => setSelectedEmailTemplateIds(new Set(Array.from(ids) as string[]))}
              bulkActions={emailTemplateBulkActions}
              onRowClick={(tpl) => {
                setEditingEmailTemplate(tpl);
                setShowEmailTemplateDrawer(true);
              }}
              defaultRowsPerPage={20}
              emptyMessage="No email templates found. Click '+ New Template' to create reusable email templates with merge tags."
            />
          ) : (
          <>
            {(() => {
              const templateColumns: TableColumn<WhatsappTemplate>[] = [
                {
                  id: "name",
                  header: "Name",
                  align: "left",
                  render: (tpl) => (
                    <button
                      onClick={() => handleEditTemplate(tpl)}
                      className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {tpl.name}
                    </button>
                  ),
                },
                {
                  id: "identifier",
                  header: "Identifier",
                  align: "left",
                  render: (tpl) => <span className="text-xs font-mono text-gray-500">{tpl.identifier}</span>,
                },
                {
                  id: "category",
                  header: "Category",
                  align: "center",
                  render: (tpl) => (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase">
                      {tpl.category}
                    </span>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  align: "center",
                  render: (tpl) => (
                    (!tpl.approvalStatus || tpl.approvalStatus === "pending") ? (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 uppercase">Pending</span>
                    ) : tpl.approvalStatus === "approved" ? (
                      <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 uppercase">Approved</span>
                    ) : (
                      <span title={tpl.rejectionReason || "Denied by Meta"} className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 rounded-full px-2 py-0.5 uppercase cursor-help">Denied</span>
                    )
                  ),
                },
                {
                  id: "language",
                  header: "Language",
                  align: "center",
                  render: (tpl) => <span className="text-xs text-gray-500">{tpl.language}</span>,
                },
              ];

              const templateRowActions: TableRowAction<WhatsappTemplate>[] = [
                {
                  label: "Edit",
                  icon: <Pencil className="w-3.5 h-3.5 text-blue-500" />,
                  onClick: (tpl) => handleEditTemplate(tpl),
                },
                {
                  label: "Get Approved",
                  icon: <ShieldCheck className="w-3.5 h-3.5 text-green-600" />,
                  hidden: (tpl) => tpl.approvalStatus === "approved",
                  onClick: (tpl) => {
                    setApprovingTemplate(tpl);
                    setShowApprovalModal(true);
                  },
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                  isDanger: true,
                  onClick: (tpl) => handleDeleteTemplate(tpl.id),
                },
              ];

              return (
                <TableComponent
                  className="rounded-2xl border-gray-200/90 shadow-xs"
                  data={filteredTemplates}
                  columns={templateColumns}
                  getRowId={(tpl) => tpl.id}
                  rowActions={templateRowActions}
                  selectedIds={selectedTemplates}
                  onSelectionChange={(ids) => setSelectedTemplates(new Set(Array.from(ids) as string[]))}
                  onRowClick={(tpl) => handleEditTemplate(tpl)}
                  defaultRowsPerPage={20}
                  emptyMessage="No templates yet. Build a pre-approved WhatsApp message template to reuse in campaigns and chatbot flows."
                />
              );
            })()}

            {/* ── WhatsApp Template Side Drawer ── */}
            <DrawerShell
              isOpen={showTemplateDrawer}
              onClose={() => {
                setShowTemplateDrawer(false);
                setEditingTemplateId(null);
              }}
              title={editingTemplateId ? "Edit WhatsApp Template" : "New WhatsApp Template"}
              subtitle="Build a pre-approved WhatsApp message template to reuse in campaigns and chatbot flows."
              icon={<FileText className="w-4 h-4 text-[#1456f0]" />}
              width="max-w-3xl"
              zIndex={600}
              footer={
                <div className="flex items-center justify-end gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateDrawer(false);
                      setEditingTemplateId(null);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTemplate()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1456f0] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </button>
                </div>
              }
            >
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Form fields */}
                <div className="flex-1 min-w-0 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Template Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={templateForm.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Appointment Reminder"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Template Identifier *
                      </label>
                      <input
                        type="text"
                        required
                        value={templateForm.identifier}
                        onChange={(e) => setTemplateForm({ ...templateForm, identifier: e.target.value })}
                        placeholder="appointment_reminder"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Category *
                      </label>
                      <Select value={templateForm.category} onValueChange={(val: any) => setTemplateForm({ ...templateForm, category: val })}>
                        <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Utility">Utility</SelectItem>
                          <SelectItem value="Authentication">Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Language *
                      </label>
                      <Select value={templateForm.language} onValueChange={(val: any) => setTemplateForm({ ...templateForm, language: val })}>
                        <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Header <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <div className="flex gap-1 text-[11px]">
                        {(["none", "text", "image", "video", "document"] as const).map((ht) => (
                          <button
                            key={ht}
                            type="button"
                            onClick={() =>
                              setTemplateForm((prev) => ({
                                ...prev,
                                headerType: ht,
                                headerText: ht === "text" ? prev.headerText || "" : "",
                                headerMediaUrl: ht !== "text" && ht !== "none" ? "" : "",
                                headerFileName: "",
                              }))
                            }
                            className={`px-2 py-0.5 rounded-full border capitalize text-[10px] font-semibold transition-colors cursor-pointer ${
                              templateForm.headerType === ht
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                            }`}
                          >
                            {ht}
                          </button>
                        ))}
                      </div>
                    </div>
                    {templateForm.headerType && templateForm.headerType !== "none" && (
                      <div className="p-3.5 space-y-3 bg-white">
                        {templateForm.headerType === "text" ? (
                          <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Header Text</label>
                            <input
                              type="text"
                              value={templateForm.headerText || ""}
                              onChange={(e) => setTemplateForm((prev) => ({ ...prev, headerText: e.target.value }))}
                              placeholder="Bold headline text..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {templateForm.headerMediaUrl ? (
                              <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-blue-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                    {templateForm.headerFileName || "Uploaded file"}
                                  </p>
                                  <p className="text-[10px] text-blue-500" style={{ fontFamily: "Outfit, sans-serif" }}>Stored as local object URL</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTemplateForm((prev) => ({ ...prev, headerMediaUrl: "", headerFileName: "" }))}
                                  className="p-1 text-blue-400 hover:text-red-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-blue-500", "bg-blue-50"); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove("border-blue-500", "bg-blue-50"); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
                                  const file = e.dataTransfer.files[0];
                                  if (file) handleFileDrop(file);
                                }}
                                className="relative border-2 border-dashed border-gray-300 rounded-xl p-5 text-center transition-all hover:border-blue-400"
                              >
                                <input
                                  type="file"
                                  accept={acceptForHeaderType}
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <p className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                    <span className="text-blue-600">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-[10px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
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

                  {/* Body Text */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Body Text *
                      </label>
                      <VariablePickerButton targetRef={textareaRef} value={templateForm.bodyText} onChange={(val) => setTemplateForm((prev) => ({ ...prev, bodyText: val }))} label="{ } Insert Variable" />
                    </div>
                    <textarea
                      ref={textareaRef}
                      required
                      value={templateForm.bodyText}
                      onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                      placeholder="Hello {{contact_name}}, your appointment is confirmed for {{appointment_date}}."
                      rows={4}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />

                    {/* Variable Field Mapping */}
                    {(() => {
                      const tokens = [...(templateForm.bodyText.matchAll(/\{\{([^}]+)\}\}/g))].map((m) => m[1].trim()).filter((v, i, a) => a.indexOf(v) === i);
                      if (tokens.length === 0) return null;
                      return (
                        <div className="border border-blue-100 rounded-xl overflow-hidden mt-2">
                          <button
                            type="button"
                            onClick={() => setShowVarMapping((v) => !v)}
                            className="w-full flex items-center justify-between px-3.5 py-2 bg-blue-50 hover:bg-blue-100/60 transition-colors text-xs font-semibold text-blue-700 cursor-pointer"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            <span>📌 Field Mapping — {tokens.length} variable{tokens.length !== 1 ? "s" : ""} detected</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showVarMapping ? "rotate-180" : ""}`} />
                          </button>
                          {showVarMapping && (
                            <div className="p-3 space-y-2.5 bg-white">
                              <p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Map each <code className="bg-gray-100 px-1 rounded">&#123;&#123;variable&#125;&#125;</code> to a static value, a MantraAssist field, or live availability.
                              </p>
                              {tokens.map((token) => {
                                const mapping = (templateForm.variableMappings || {})[token] || { source: "static" as const, staticValue: "", fieldKey: "" };
                                const setMapping = (patch: Partial<typeof mapping>) =>
                                  setTemplateForm((prev) => ({
                                    ...prev,
                                    variableMappings: {
                                      ...(prev.variableMappings || {}),
                                      [token]: { ...mapping, ...patch },
                                    },
                                  }));
                                return (
                                  <div key={token} className="p-2.5 border border-gray-100 rounded-lg bg-gray-50 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <code className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">&#123;&#123;{token}&#125;&#125;</code>
                                      <div className="flex gap-1 ml-auto">
                                        {(["static", "field", "availability"] as const).map((src) => (
                                          <button
                                            key={src}
                                            type="button"
                                            onClick={() => setMapping({ source: src })}
                                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors capitalize cursor-pointer ${
                                              mapping.source === src
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
                                        onChange={(e) => setMapping({ staticValue: e.target.value })}
                                        placeholder="Static replacement value"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      />
                                    )}
                                    {mapping.source === "field" && (
                                      <select
                                        value={mapping.fieldKey || ""}
                                        onChange={(e) => setMapping({ fieldKey: e.target.value })}
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

                  {/* Footer Text */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Footer Text <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={templateForm.footerText}
                      onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                      placeholder="e.g. Reply STOP to opt out"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        Buttons <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {templateForm.buttons.length}/3
                      </span>
                    </div>

                    {templateForm.buttons.map((btn, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-600">Button {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveButton(index)}
                            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={btn.type}
                            onChange={(e) => handleButtonChange(index, "type", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                          >
                            <option value="quick_reply">Quick Reply</option>
                            <option value="call">Call Phone Number</option>
                            <option value="url">Visit Website</option>
                            <option value="email">Send Email</option>
                          </select>
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) => handleButtonChange(index, "label", e.target.value)}
                            placeholder="Button text..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg"
                          />
                        </div>

                        {btn.type === "call" && (
                          <input
                            type="tel"
                            value={btn.value || ""}
                            onChange={(e) => handleButtonChange(index, "value", e.target.value)}
                            placeholder="+1 555 123 4567"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg"
                          />
                        )}
                        {btn.type === "url" && (
                          <input
                            type="url"
                            value={btn.value || ""}
                            onChange={(e) => handleButtonChange(index, "value", e.target.value)}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                          />
                        )}
                        {btn.type === "email" && (
                          <input
                            type="email"
                            value={btn.value || ""}
                            onChange={(e) => handleButtonChange(index, "value", e.target.value)}
                            placeholder="support@example.com"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddButton}
                      disabled={templateForm.buttons.length >= 3}
                      className="w-full py-2 text-xs font-semibold border border-dashed border-gray-300 text-blue-600 rounded-lg hover:bg-blue-50/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Button
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview Phone */}
                <div className="w-[260px] shrink-0 sticky top-0 space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
                  </div>
                  <div className="rounded-2xl border-4 border-gray-800 overflow-hidden shadow-md bg-[#E5DDD5] h-[340px] flex flex-col">
                    <div className="bg-[#075E54] text-white p-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">WA</div>
                      <p className="text-[10px] font-bold">Mantra Health</p>
                    </div>
                    <div className="flex-1 p-2.5 overflow-y-auto flex flex-col justify-end">
                      <div className="bg-white rounded-lg shadow-xs p-2 text-[11px] text-gray-800 max-w-[95%] rounded-tl-none space-y-1 select-none">
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
                            <Play className="w-4 h-4 text-white" />
                            <span className="text-[9px] text-white font-medium">Video</span>
                          </div>
                        )}
                        {templateForm.headerType === "document" && (
                          <div className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1">
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[9px] text-gray-700 font-medium truncate">{templateForm.headerFileName || "document.pdf"}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-tight text-gray-700 text-[11px]">{templateForm.bodyText || "Template body goes here..."}</p>
                        {templateForm.footerText && <p className="text-[9px] text-gray-400">{templateForm.footerText}</p>}
                      </div>
                      {templateForm.buttons.length > 0 && (
                        <div className="bg-white rounded-b-lg shadow-xs max-w-[95%] mt-0.5 overflow-hidden">
                          {templateForm.buttons.map((btn, i) => (
                            <div
                              key={i}
                              className={`px-2.5 py-1.5 text-[10px] font-semibold text-center text-blue-600 flex items-center justify-center gap-1 ${
                                i > 0 ? "border-t border-gray-100" : ""
                              }`}
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
            </DrawerShell>
          </>
          )
        )}

      </div>

      {/* ── Slim Side Drawer: Website Widget Settings ── */}
      <DrawerShell
        isOpen={showWebsiteSettingsDrawer}
        onClose={() => setShowWebsiteSettingsDrawer(false)}
        title="Website Widget Settings"
        subtitle="Configure chat widget design, working hours, and requirement mapping."
        icon={<Globe className="w-4 h-4 text-[#6366F1]" />}
        width="max-w-2xl sm:max-w-3xl"
        zIndex={600}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowWebsiteSettingsDrawer(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (widgetSettingsSaveRef.current) widgetSettingsSaveRef.current();
                setShowWebsiteSettingsDrawer(false);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        }
      >
        <div className="p-4">
          <WebsiteWidgetSettingsTab
            registerSaveHandler={(fn) => {
              widgetSettingsSaveRef.current = fn;
            }}
            onNavigateToInbox={() => setShowWebsiteSettingsDrawer(false)}
          />
        </div>
      </DrawerShell>

      {/* ── Slim Side Drawer: Companion Care Bot Settings ── */}
      <DrawerShell
        isOpen={showCompanionSettingsDrawer}
        onClose={() => setShowCompanionSettingsDrawer(false)}
        title="Companion Settings"
        subtitle="Configure patient portal Care Bot, intent greeting, and process mapping."
        icon={<Bot className="w-4 h-4 text-[#2563EB]" />}
        width="max-w-xl sm:max-w-2xl"
        zIndex={600}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowCompanionSettingsDrawer(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (companionSaveRef.current) companionSaveRef.current();
                setShowCompanionSettingsDrawer(false);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        }
      >
        <CompanionSettingsTab
          isDrawer
          registerSaveHandler={(fn) => {
            companionSaveRef.current = fn;
          }}
          onNavigateToInbox={() => setShowCompanionSettingsDrawer(false)}
        />
      </DrawerShell>


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

      <AssignResponsibleModal
        isOpen={assignAgentMenuOpen}
        onClose={() => setAssignAgentMenuOpen(false)}
        currentAssignedId={activeConversation?.assignedPersonId}
        contactName={activeConversation?.contactName}
        onAssign={handleAssignPerson}
      />

      {LEGACY_CHATBOT_MODULE_ENABLED && (
        <EnrollCampaignModal
          isOpen={showEnrollCampaignModal}
          onClose={() => setShowEnrollCampaignModal(false)}
          onEnroll={handleEnrollCampaign}
        />
      )}

      <TestProcessChatDrawer
        isOpen={showTestProcessDrawer}
        onClose={() => setShowTestProcessDrawer(false)}
        processes={processes}
        getWorkflowStepsForStage={getWorkflowStepsForStage}
      />

      <TestWebsiteChatDrawer
        isOpen={showTestWebsiteDrawer}
        onClose={() => setShowTestWebsiteDrawer(false)}
      />

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

      <EmailTemplateDrawer
        isOpen={showEmailTemplateDrawer}
        onClose={() => {
          setShowEmailTemplateDrawer(false);
          setEditingEmailTemplate(null);
        }}
        template={editingEmailTemplate}
        onSave={handleSaveEmailTemplate}
      />

      <EmailBlacklistDrawer
        isOpen={showBlacklistDrawer}
        onClose={() => setShowBlacklistDrawer(false)}
      />

      <MailboxIntegrationDrawer
        isOpen={showMailboxIntegrationDrawer}
        onClose={() => setShowMailboxIntegrationDrawer(false)}
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
