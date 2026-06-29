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
  Pencil,
  Info,
  HelpCircle,
  X,
  FileText,
  AlertCircle,
  Clock,
  Phone,
  ChevronRight,
  MoreVertical,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tooltip } from "../components/ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Type definitions
interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "contact" | "me";
  status?: "sent" | "delivered" | "read";
  buttons?: Array<{ type: string; label: string; value?: string }>;
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
  buttons: Array<{ type: "quick_reply" | "cta_phone" | "cta_url" | "send_template"; label: string; value?: string }>;
  createdAt: string;
}

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
  {
    value: "org", label: "Organization Fields", fields: [
      { value: "org_name", label: "Organization Name" },
      { value: "org_domain", label: "Organization Domain" },
    ]
  },
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
      { id: "msg-1-3", text: "I wanted to change my appointment slot to 3:00 PM if possible.", timestamp: "10:35 AM", sender: "contact" }
    ]
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
      { id: "msg-2-2", text: "Thanks, I will confirm by tonight.", timestamp: "Yesterday, 4:20 PM", sender: "contact" }
    ]
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
      { id: "msg-3-2", text: "Awesome service! Thanks for checking in.", timestamp: "Yesterday, 11:15 AM", sender: "contact" }
    ]
  },
  {
    id: "conv-4",
    contactName: "David Miller",
    phoneNumber: "+1 (555) 456-7890",
    channel: "whatsapp",
    lastMessage: "Can I reschedule for Friday?",
    timestamp: "2 days ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-4-1", text: "Your check-up is scheduled for Wednesday.", timestamp: "2 days ago", sender: "me", status: "read" },
      { id: "msg-4-2", text: "Can I reschedule for Friday?", timestamp: "2 days ago", sender: "contact" }
    ]
  },
  {
    id: "conv-5",
    contactName: "Amanda Ross",
    phoneNumber: "+1 (555) 765-4321",
    channel: "sms",
    lastMessage: "Received the report. Thank you.",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-5-1", text: "Your health summary PDF is ready.", timestamp: "3 days ago", sender: "me", status: "read" },
      { id: "msg-5-2", text: "Received the report. Thank you.", timestamp: "3 days ago", sender: "contact" }
    ]
  },
  {
    id: "conv-6",
    contactName: "James O'Connor",
    phoneNumber: "+1 (555) 901-2345",
    channel: "whatsapp",
    lastMessage: "Thank you for the update.",
    timestamp: "4 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-6-1", text: "Hi James, your prescription has been updated at the pharmacy.", timestamp: "4 days ago", sender: "me", status: "read" },
      { id: "msg-6-2", text: "Thank you for the update.", timestamp: "4 days ago", sender: "contact" }
    ]
  }
];

interface VariablePickerButtonProps {
  targetRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
}

const VariablePickerButton: React.FC<VariablePickerButtonProps> = ({
  targetRef,
  value,
  onChange,
  label = "Insert Variable"
}) => {
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
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {label}
      </button>
      {isOpen && dropdownPos && createPortal(
        <>
          <div className="fixed inset-0 cursor-default" style={{ zIndex: 9998 }} onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownPanelRef}
            className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden flex flex-col"
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, width: '256px', maxHeight: '256px', zIndex: 9999 }}
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Insert Field Variable
              </span>
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {FETCH_FIELD_SOURCES.map(group => (
                <div key={group.value}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/30 border-y border-gray-100/50" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {group.label}
                  </div>
                  <div className="py-0.5">
                    {group.fields.map(field => (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => handleSelectField(field.value)}
                        className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
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

export default function Chats() {
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"chats" | "templates">("chats");

  // Sync tab with query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "templates") {
      setActiveTab("templates");
    } else {
      setActiveTab("chats");
    }
  }, [location.search]);

  const handleTabChange = (tab: "chats" | "templates") => {
    setActiveTab(tab);
    navigate(`/chats?tab=${tab}`, { replace: true });
  };

  // ==========================================
  // STATE & LOGIC: INBOX (CHATS TAB)
  // ==========================================
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

  useEffect(() => {
    localStorage.setItem("whatsappMockConversations", JSON.stringify(conversations));
  }, [conversations]);

  const activeConversation = conversations.find(c => c.id === selectedConversationId);

  // Clear unread count when reading a conversation
  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0) {
      setConversations(prev =>
        prev.map(c => c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c)
      );
    }
  }, [selectedConversationId]);

  const handleMarkResolved = () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === "open" ? "resolved" : "open";
    setConversations(prev =>
      prev.map(c => c.id === selectedConversationId ? { ...c, status: newStatus } : c)
    );
    toast.success(`Conversation marked as ${newStatus}`);
  };

  const handleSendMessage = () => {
    if (!composerText.trim() || !activeConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: composerText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "me",
      status: "read"
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === selectedConversationId) {
          return {
            ...c,
            lastMessage: composerText,
            timestamp: "Just now",
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    );

    setComposerText("");
    toast.success("Message sent");
  };

  const handleAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      if (input.files && input.files[0]) {
        toast.success(`File "${input.files[0].name}" attached (Visual Only)`);
      }
    };
    input.click();
  };

  // Filtered conversation list
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) ||
                          c.phoneNumber.includes(chatSearch) ||
                          c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
    const matchesChannel = channelFilter === "all" ? true : c.channel === channelFilter;
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  // ==========================================
  // STATE & LOGIC: TEMPLATES TAB
  // ==========================================
  const [globalTemplates, setGlobalTemplates] = useState<WhatsappTemplate[]>(() => {
    const stored = localStorage.getItem("whatsappGlobalTemplates");
    return stored ? JSON.parse(stored) : [];
  });

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showBuilderForm, setShowBuilderForm] = useState(false);

  // Form states
  const [templateForm, setTemplateForm] = useState<Omit<WhatsappTemplate, "id" | "createdAt">>({
    name: "",
    identifier: "",
    category: "Marketing",
    language: "English",
    header: { type: "none", content: "" },
    bodyText: "",
    footerText: "",
    buttons: []
  });

  useEffect(() => {
    localStorage.setItem("whatsappGlobalTemplates", JSON.stringify(globalTemplates));
  }, [globalTemplates]);

  // Handle template name to identifier auto-slugify
  const handleNameChange = (nameVal: string) => {
    const identifierVal = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    setTemplateForm(prev => ({
      ...prev,
      name: nameVal,
      identifier: editingTemplateId ? prev.identifier : identifierVal
    }));
  };



  // Repeatable buttons logic
  const handleAddButton = () => {
    if (templateForm.buttons.length >= 3) {
      toast.error("You can add a maximum of 3 buttons.");
      return;
    }
    setTemplateForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: "quick_reply", label: "", value: "" }]
    }));
  };

  const handleRemoveButton = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const handleButtonChange = (index: number, key: string, value: string) => {
    setTemplateForm(prev => {
      const updatedButtons = prev.buttons.map((btn, i) => {
        if (i === index) {
          return { ...btn, [key]: value };
        }
        return btn;
      });
      return { ...prev, buttons: updatedButtons };
    });
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      name: "",
      identifier: "",
      category: "Marketing",
      language: "English",
      header: { type: "none", content: "" },
      bodyText: "",
      footerText: "",
      buttons: []
    });
    setShowBuilderForm(true);
  };

  const handleEditTemplate = (tpl: WhatsappTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateForm({
      name: tpl.name,
      identifier: tpl.identifier,
      category: tpl.category,
      language: tpl.language,
      header: tpl.header || { type: "none", content: "" },
      bodyText: tpl.bodyText,
      footerText: tpl.footerText || "",
      buttons: tpl.buttons || []
    });
    setShowBuilderForm(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setGlobalTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted successfully");
      if (editingTemplateId === id) {
        setShowBuilderForm(false);
        setEditingTemplateId(null);
      }
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateForm.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!templateForm.identifier.trim()) {
      toast.error("Template identifier is required");
      return;
    }
    if (!templateForm.bodyText.trim()) {
      toast.error("Template body text is required");
      return;
    }

    // Check if identifier is unique among other templates
    const isDuplicate = globalTemplates.some(
      t => t.identifier.toLowerCase() === templateForm.identifier.toLowerCase() && t.id !== editingTemplateId
    );

    if (isDuplicate) {
      toast.error("Template identifier must be unique");
      return;
    }

    if (editingTemplateId) {
      // Edit
      setGlobalTemplates(prev =>
        prev.map(t =>
          t.id === editingTemplateId
            ? {
                ...t,
                name: templateForm.name,
                identifier: templateForm.identifier,
                category: templateForm.category,
                language: templateForm.language,
                header: templateForm.header,
                bodyText: templateForm.bodyText,
                footerText: templateForm.footerText,
                buttons: templateForm.buttons
              }
            : t
        )
      );
      toast.success("Template updated successfully");
    } else {
      // Add
      const newTemplate: WhatsappTemplate = {
        id: `tpl-${Date.now()}`,
        name: templateForm.name,
        identifier: templateForm.identifier,
        category: templateForm.category,
        language: templateForm.language,
        header: templateForm.header,
        bodyText: templateForm.bodyText,
        footerText: templateForm.footerText,
        buttons: templateForm.buttons,
        createdAt: new Date().toISOString()
      };
      setGlobalTemplates(prev => [...prev, newTemplate]);
      toast.success("Template created successfully");
    }

    setShowBuilderForm(false);
    setEditingTemplateId(null);
  };

  // Helper for contact avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-6">
        <PageHeader
          title="Chats"
          subtitle="Manage WhatsApp & SMS conversations and message templates"
        />

        {/* Tab switcher wrapper */}
        <div className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded-xl shadow-sm">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => handleTabChange("chats")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "chats"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Chats
            </button>
            <button
              onClick={() => handleTabChange("templates")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "templates"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Template Builder
            </button>
          </div>
        </div>

        {/* TAB 1: CHATS INBOX */}
        {activeTab === "chats" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex h-[calc(100vh-250px)] overflow-hidden">
            {/* Left Pane (Sidebar) */}
            <div className="w-[340px] border-r border-gray-200 flex flex-col h-full bg-gray-50/50">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>

              {/* Filters Panel */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white space-y-3">
                {/* Channel Filter Pills */}
                <div className="flex gap-1.5">
                  {(["all", "whatsapp", "sms"] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannelFilter(ch)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
                        channelFilter === ch
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {ch === "all" ? "All" : ch === "whatsapp" ? "WhatsApp" : "SMS"}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500" style={{ fontFamily: "DM Sans, sans-serif" }}>Status:</span>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    No conversations found.
                  </div>
                ) : (
                  filteredConversations.map(conv => {
                    const isSelected = conv.id === selectedConversationId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-blue-50/20 transition-all border-l-[3px] ${
                          isSelected
                            ? "bg-[#EFF6FF] border-blue-600"
                            : "border-transparent bg-white"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shadow-sm">
                            {getInitials(conv.contactName)}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            {conv.channel === "whatsapp" ? (
                              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </span>
                        </div>

                        {/* Summary Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {conv.contactName}
                            </h4>
                            <span className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {conv.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {conv.lastMessage}
                          </p>
                        </div>

                        {/* Unread Indicator */}
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane (Chat Screen) */}
            <div className="flex-1 flex flex-col h-full bg-white">
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {activeConversation.contactName}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">
                          {activeConversation.phoneNumber}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase ${
                        activeConversation.channel === "whatsapp"
                          ? "bg-[#E8F8F0] border-[#A8E6CF] text-[#2E7D32]"
                          : "bg-blue-50 border-blue-100 text-blue-700"
                      }`}>
                        {activeConversation.channel}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkResolved}
                      className={activeConversation.status === "resolved" ? "border-green-500 text-green-600" : ""}
                    >
                      {activeConversation.status === "resolved" ? "Re-open Chat" : "Mark Resolved"}
                    </Button>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4">
                    {activeConversation.messages.map(msg => {
                      const isMe = msg.sender === "me";
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[70%] space-y-1">
                            <div className={`p-4 rounded-2xl shadow-sm text-sm ${
                              isMe
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                            }`} style={{ fontFamily: "Outfit, sans-serif" }}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                              {/* Interactive template buttons (visual only) */}
                              {msg.buttons && msg.buttons.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                                  {msg.buttons.map((btn, idx) => (
                                    <button
                                      key={idx}
                                      disabled
                                      className="w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold text-center pointer-events-none"
                                      style={{ fontFamily: "DM Sans, sans-serif" }}
                                    >
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={`flex items-center gap-1.5 text-[10px] text-gray-400 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span>{msg.timestamp}</span>
                              {isMe && (
                                <span>
                                  {msg.status === "read" ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                  ) : msg.status === "delivered" ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Composer Controls */}
                  <div className="p-4 border-t border-gray-200 bg-white relative">
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={handleAttachment}
                        className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all shadow-sm border border-gray-100"
                        title="Attach File"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={composerText}
                          onChange={e => setComposerText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSendMessage();
                          }}
                          placeholder="Type your message..."
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />

                        {/* WhatsApp Templates Trigger */}
                        {activeConversation.channel === "whatsapp" && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <button
                              type="button"
                              onClick={() => setShowUseTemplateDropdown(!showUseTemplateDropdown)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              Use Template
                            </button>

                            {showUseTemplateDropdown && (
                              <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                                <div className="p-2.5 bg-gray-50 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Template</span>
                                  <button onClick={() => setShowUseTemplateDropdown(false)}>
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto py-1">
                                  {globalTemplates.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                      No templates created yet.
                                    </div>
                                  ) : (
                                    globalTemplates.map(t => (
                                      <button
                                        key={t.id}
                                        onClick={() => {
                                          setComposerText(t.bodyText);
                                          setShowUseTemplateDropdown(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex justify-between items-center"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      >
                                        <span className="font-medium truncate mr-2">{t.name}</span>
                                        <span className="text-[9px] text-gray-400 shrink-0 font-semibold">{t.category}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-md"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Select a conversation to view messages
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Choose a WhatsApp or SMS chat thread from the left column to read messages and reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEMPLATE BUILDER */}
        {activeTab === "templates" && (
          <div className="flex gap-6 min-h-[calc(100vh-250px)] items-start">
            {/* Left Column: Template List (340px) */}
            <div className="w-[340px] bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 shrink-0 max-h-[calc(100vh-250px)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>Templates</h3>
                <Button variant="primary" size="sm" onClick={handleCreateNewTemplate}>
                  <Plus className="w-4 h-4" />
                  New Template
                </Button>
              </div>

              {globalTemplates.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                  <MessageCircle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>No templates saved yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {globalTemplates.map(tpl => {
                    const isSelected = editingTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleEditTemplate(tpl)}
                        className={`p-4 border rounded-xl cursor-pointer hover:border-blue-400 transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/10 shadow-sm"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate mr-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            {tpl.name}
                          </h4>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase shrink-0">
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-400 truncate mb-3">{tpl.identifier}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span style={{ fontFamily: "Outfit, sans-serif" }}>Language: {tpl.language}</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleEditTemplate(tpl);
                              }}
                              className="p-1 hover:bg-gray-100 rounded-md text-gray-600"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteTemplate(tpl.id);
                              }}
                              className="p-1 hover:bg-red-50 rounded-md text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Editor Form & Live Preview */}
            <div className="flex-1 flex gap-6 items-start">
              {showBuilderForm ? (
                <>
                  {/* Builder Form (Left side of right pane) */}
                  <form
                    onSubmit={handleSaveTemplate}
                    className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {editingTemplateId ? "Edit Template" : "New WhatsApp Template"}
                      </h3>
                      <button type="button" onClick={() => setShowBuilderForm(false)}>
                        <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Template Name *</label>
                        <input
                          type="text"
                          required
                          value={templateForm.name}
                          onChange={e => handleNameChange(e.target.value)}
                          placeholder="e.g. Appointment Reminder"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      </div>

                      {/* Identifier */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Template Identifier *</label>
                        <input
                          type="text"
                          required
                          value={templateForm.identifier}
                          onChange={e => setTemplateForm({ ...templateForm, identifier: e.target.value })}
                          placeholder="e.g. appointment_reminder"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Unique internally-referenced template key</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Category */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Category *</label>
                        <Select
                          value={templateForm.category}
                          onValueChange={(val: any) => setTemplateForm({ ...templateForm, category: val })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Utility">Utility</SelectItem>
                            <SelectItem value="Authentication">Authentication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Language *</label>
                        <Select
                          value={templateForm.language}
                          onValueChange={(val: any) => setTemplateForm({ ...templateForm, language: val })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map(lang => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Header Setup */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Header (Optional)</label>
                      <div className="flex gap-2">
                        {(["none", "text", "image"] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTemplateForm(prev => ({ ...prev, header: { type, content: "" } }))}
                            className={`px-4 py-1.5 rounded-lg border text-xs font-semibold uppercase transition-all ${
                              templateForm.header.type === type
                                ? "bg-blue-50 border-blue-400 text-blue-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      {templateForm.header.type === "text" && (
                        <input
                          type="text"
                          required
                          value={templateForm.header.content || ""}
                          onChange={e => setTemplateForm(prev => ({ ...prev, header: { ...prev.header, content: e.target.value } }))}
                          placeholder="Enter header text..."
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 animate-fadeIn"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      )}

                      {templateForm.header.type === "image" && (
                        <div className="p-6 border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl flex flex-col items-center justify-center text-center cursor-not-allowed">
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-xs font-semibold text-gray-400">Media Upload Sandbox</span>
                          <span className="text-[10px] text-gray-400 mt-1">Image payload references can be configured at integration dispatch</span>
                        </div>
                      )}
                    </div>

                    {/* Body Text */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Body Text *</label>
                        <VariablePickerButton
                          targetRef={textareaRef}
                          value={templateForm.bodyText}
                          onChange={(val) => setTemplateForm(prev => ({ ...prev, bodyText: val }))}
                          label="{ } Insert Variable"
                        />
                      </div>
                      <textarea
                        ref={textareaRef}
                        required
                        value={templateForm.bodyText}
                        onChange={e => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                        placeholder="Hello {{1}}, your appointment is at {{2}}..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* Footer Text */}
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>Footer Text (Optional)</label>
                      <input
                        type="text"
                        value={templateForm.footerText}
                        onChange={e => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                        placeholder="e.g. Reply STOP to opt out"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    {/* Buttons Builder */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>Interactive Buttons (Max 3)</label>
                        {templateForm.buttons.length < 3 && (
                          <button
                            type="button"
                            onClick={handleAddButton}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Button
                          </button>
                        )}
                      </div>

                      {templateForm.buttons.map((btn, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => handleRemoveButton(idx)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Type</label>
                              <Select
                                value={btn.type}
                                onValueChange={(val: any) => handleButtonChange(idx, "type", val)}
                              >
                                <SelectTrigger className="w-full bg-white h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="quick_reply">Quick Reply</SelectItem>
                                  <SelectItem value="cta_phone">Call to Action — Phone</SelectItem>
                                  <SelectItem value="cta_url">Call to Action — URL</SelectItem>
                                  <SelectItem value="send_template">Send Template</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Label</label>
                              <input
                                type="text"
                                required
                                value={btn.label}
                                onChange={e => handleButtonChange(idx, "label", e.target.value)}
                                placeholder="Button Text..."
                                className="w-full bg-white px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              />
                            </div>
                          </div>

                          {(btn.type === "cta_phone" || btn.type === "cta_url") && (
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {btn.type === "cta_phone" ? "Phone Number" : "Destination URL"}
                              </label>
                              <input
                                type="text"
                                required
                                value={btn.value || ""}
                                onChange={e => handleButtonChange(idx, "value", e.target.value)}
                                placeholder={btn.type === "cta_phone" ? "+14155238886" : "https://example.com"}
                                className="w-full bg-white px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                              />
                            </div>
                          )}
                          {btn.type === "send_template" && (
                            <div className="space-y-2">
                              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Linked Template
                              </label>
                              <select
                                value={btn.value || ""}
                                onChange={e => handleButtonChange(idx, "value", e.target.value)}
                                className="w-full bg-white px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                <option value="">Select a template...</option>
                                {globalTemplates
                                  .filter(t => t.id !== editingTemplateId)
                                  .map(t => (
                                    <option key={t.id} value={t.identifier}>{t.name} ({t.category})</option>
                                  ))
                                }
                              </select>
                              {globalTemplates.filter(t => t.id !== editingTemplateId).length === 0 && (
                                <p className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  No other templates yet.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => { handleCreateNewTemplate(); }}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                <Plus className="w-3 h-3" /> Create new template
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setShowBuilderForm(false);
                          setEditingTemplateId(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit">
                        Save Template
                      </Button>
                    </div>
                  </form>

                  {/* Phone Mockup Live Preview */}
                  <div className="w-[300px] shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto animate-fadeIn">
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</span>
                    </div>

                    {/* Phone frame wrapper */}
                    <div className="rounded-2xl border-4 border-gray-800 overflow-hidden shadow-inner bg-[#E5DDD5] h-[360px] flex flex-col relative">
                      {/* WhatsApp Mockup Header */}
                      <div className="bg-[#075E54] text-white p-2.5 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                          WA
                        </div>
                        <div>
                          <p className="text-[10px] font-bold leading-none">Mantra Health</p>
                          <p className="text-[8px] opacity-75">online</p>
                        </div>
                      </div>

                      {/* Chats Space */}
                      <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end">
                        {/* Chat Bubble */}
                        <div className="bg-white rounded-lg shadow-sm p-2 text-[11px] text-gray-800 max-w-[90%] rounded-tl-none space-y-1 select-none">
                          {templateForm.header.type === "text" && templateForm.header.content && (
                            <p className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">
                              {templateForm.header.content}
                            </p>
                          )}
                          {templateForm.header.type === "image" && (
                            <div className="w-full h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center mb-1.5">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          )}

                          <p className="whitespace-pre-wrap leading-tight text-gray-700 font-sans">
                            {templateForm.bodyText || "Template body goes here..."}
                          </p>

                          {templateForm.footerText && (
                            <p className="text-[9px] text-gray-400">
                              {templateForm.footerText}
                            </p>
                          )}
                        </div>

                        {/* Interactive Buttons Preview (Rendered below bubble) */}
                        {templateForm.buttons.length > 0 && (
                          <div className="mt-1.5 max-w-[90%] space-y-1">
                            {templateForm.buttons.map((btn, index) => (
                              <div
                                key={index}
                                className="w-full bg-white border border-gray-200 text-blue-600 rounded-lg py-1.5 px-3 text-[10px] font-semibold text-center shadow-sm select-none flex items-center justify-center gap-1"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                {btn.type === "send_template" && <span>↩</span>}
                                {btn.type === "cta_phone" && <span>📞</span>}
                                {btn.type === "cta_url" && <span>🔗</span>}
                                {btn.label || `Button ${index + 1}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center h-[calc(100vh-250px)] flex flex-col items-center justify-center animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Select or create a template to begin
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm text-center mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select an existing WhatsApp template from the left column to edit it, or click "+ New Template" to configure a new one.
                  </p>
                  <Button variant="primary" onClick={handleCreateNewTemplate}>
                    <Plus className="w-4 h-4" />
                    Create Template
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
