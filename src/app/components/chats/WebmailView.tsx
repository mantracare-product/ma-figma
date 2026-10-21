import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mail,
  Search,
  Plus,
  Trash2,
  Folder,
  Inbox,
  FileEdit,
  Send,
  AlertOctagon,
  RefreshCw,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronRight,
  Settings as SettingsIcon,
  X,
  Star,
  Paperclip,
  CheckSquare,
  MessageCircle,
  Calendar,
  Share2,
  ExternalLink,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Sparkles,
  User,
  Shield,
  Layers,
  Clock,
  Archive,
} from "lucide-react";
import { Drawer } from "../ui/drawer";
import { Modal } from "../ui/Modal";
import { TableComponent, TableColumn, TableBulkAction, TableRowAction } from "../ui/TableComponent";
import { toast } from "sonner";

export interface EmailItem {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  fullDate: string;
  isUnread: boolean;
  avatarColor: string;
  avatarLetter: string;
  folder: "inbox" | "drafts" | "sent" | "spam" | "trash";
  crmLinked?: boolean;
}

export interface EmailSignature {
  id: string;
  title: string;
  body: string;
  user: string;
  isDefault: boolean;
}

const DEFAULT_SIGNATURES: EmailSignature[] = [
  {
    id: "sig-1",
    title: "Regard, Navodya Jain Product Associate Mantra Care",
    body: "Regard,\nNavodya Jain\nProduct Associate\nMantra Care",
    user: "navodya@mantra.care",
    isDefault: true,
  },
];

const INITIAL_EMAILS: EmailItem[] = [
  {
    id: "em-1",
    fromName: "Google",
    fromEmail: "no-reply@accounts.google.com",
    subject: "Security alert",
    preview: "A new sign-in on Windows device was detected for your account.",
    body: "Hi Navodya,\n\nA new sign-in on Windows device was detected for your account navodya@mantra.care.\n\nTime: Today, 15:30 IST\nDevice: Windows 11 Chrome\nLocation: New Delhi, India\n\nIf this was you, you don't need to do anything. If this wasn't you, please secure your account immediately.",
    time: "15:30",
    fullDate: "Today at 3:30 PM",
    isUnread: true,
    avatarColor: "bg-[#0F9D58] text-white",
    avatarLetter: "G",
    folder: "inbox",
  },
  {
    id: "em-2",
    fromName: "Rime",
    fromEmail: "team@rime.io",
    subject: "[Rime] How to run a successful pilot",
    preview: "Learn the step-by-step framework our top customers use to launch enterprise pilots.",
    body: "Hi team,\n\nRunning an enterprise pilot shouldn't feel like a shot in the dark. In this guide, we break down:\n1. Setting mutual success metrics before kickoff\n2. Selecting the right champion and department cohort\n3. Weekly cadence checkpoints and review dashboards\n\nCheck out the full framework in our documentation portal.",
    time: "15:22",
    fullDate: "Today at 3:22 PM",
    isUnread: true,
    avatarColor: "bg-[#6366F1] text-white",
    avatarLetter: "R",
    folder: "inbox",
  },
  {
    id: "em-3",
    fromName: "Mantracare",
    fromEmail: "care@mantracare.com",
    subject: "Meet your Therapist/ Psychologist",
    preview: "Your session with Dr. Ananya Sharma has been scheduled for tomorrow.",
    body: "Hello Navodya,\n\nYour consultation session has been confirmed.\n\nProvider: Dr. Ananya Sharma (Clinical Psychologist)\nDate: Tomorrow, Oct 22\nTime: 11:00 AM - 11:45 AM\nMode: Video consultation\n\nPlease ensure your camera and microphone are tested prior to joining.",
    time: "11:46",
    fullDate: "Today at 11:46 AM",
    isUnread: true,
    avatarColor: "bg-[#EA580C] text-white",
    avatarLetter: "M",
    folder: "inbox",
  },
  {
    id: "em-4",
    fromName: "Mantracare",
    fromEmail: "auth@mantracare.com",
    subject: "MantraCare verification code",
    preview: "Your single-use login verification code is 849-201.",
    body: "Your verification code is: 849-201\n\nThis code will expire in 10 minutes. Please do not share this code with anyone.",
    time: "9:37",
    fullDate: "Today at 9:37 AM",
    isUnread: false,
    avatarColor: "bg-[#EA580C] text-white",
    avatarLetter: "M",
    folder: "inbox",
  },
  {
    id: "em-5",
    fromName: "McKenzie Anderson",
    fromEmail: "m.anderson@acmecapital.com",
    subject: "Compare Top tools before 2027",
    preview: "Here is our quarterly evaluation benchmarking top CRM and telehealth platforms.",
    body: "Hi Navodya,\n\nFollowing up on our strategy discussion last week. We reviewed 12 market offerings across patient intake, automated scheduling, and EHR bi-directional sync.\n\nLet's connect this Friday to go over our scoring matrix.\n\nBest,\nMcKenzie",
    time: "3:27",
    fullDate: "Today at 3:27 AM",
    isUnread: true,
    avatarColor: "bg-[#84CC16] text-white",
    avatarLetter: "MA",
    folder: "inbox",
  },
  {
    id: "em-6",
    fromName: "Fred from Fireflies.ai",
    fromEmail: "fred@fireflies.ai",
    subject: "Free unlimited dictation, now on your phone",
    preview: "Record, transcribe, and summarize meetings on iOS and Android seamlessly.",
    body: "Hey there,\n\nWe're excited to introduce on-the-go dictation right from your mobile device. Tap record during hospital rounds or patient consults and get structured notes instantly in your inbox.\n\nDownload the mobile update today.",
    time: "2:20",
    fullDate: "Today at 2:20 AM",
    isUnread: true,
    avatarColor: "bg-[#3B82F6] text-white",
    avatarLetter: "F",
    folder: "inbox",
  },
  {
    id: "em-7",
    fromName: "Commure",
    fromEmail: "events@commure.com",
    subject: "You're invited: Coffee with Commure on October 29",
    preview: "Join health system leaders for breakfast and clinical workflow discussions.",
    body: "Dear Colleague,\n\nYou're invited to an executive coffee roundtable exploring AI-driven clinical documentation and front-office automation.\n\nDate: October 29, 2026\nTime: 8:30 AM - 10:00 AM\nVenue: The Innovation Hub / Virtual Stream\n\nRSVP to reserve your seat.",
    time: "Oct 20",
    fullDate: "Oct 20 at 4:15 PM",
    isUnread: true,
    avatarColor: "bg-[#8B5CF6] text-white",
    avatarLetter: "C",
    folder: "inbox",
  },
  {
    id: "em-8",
    fromName: "Team Software Advice",
    fromEmail: "news@softwareadvice.com",
    subject: "83% regret their software choice—here's why",
    preview: "Unclear vendor roadmaps and integration bottlenecks cause the biggest pain.",
    body: "New Research Report:\n\nOur survey of over 1,500 healthcare administrators uncovered why EHR and patient portal migrations hit snags, and how to future-proof your tech stack before signing multi-year agreements.",
    time: "Oct 20",
    fullDate: "Oct 20 at 1:40 PM",
    isUnread: true,
    avatarColor: "bg-[#EAB308] text-white",
    avatarLetter: "TS",
    folder: "inbox",
  },
  {
    id: "em-9",
    fromName: "Rime",
    fromEmail: "team@rime.io",
    subject: "[Rime] Dedicated slack channel",
    preview: "Your VIP priority support channel has been provisioned.",
    body: "Navodya,\n\nWe have created a shared Slack channel with your engineering leads. Click below to join and receive real-time answers to technical questions.",
    time: "Oct 20",
    fullDate: "Oct 20 at 11:10 AM",
    isUnread: false,
    avatarColor: "bg-[#6366F1] text-white",
    avatarLetter: "R",
    folder: "inbox",
  },
  {
    id: "em-10",
    fromName: "Linktree",
    fromEmail: "updates@linktr.ee",
    subject: "Insights to take you further 🚀",
    preview: "Discover new conversion analytics and engagement trends for your clinical links.",
    body: "Here is your weekly recap for October. Over 4,200 unique patients visited your booking link, resulting in a 24% conversion rate to completed appointments.",
    time: "Oct 20",
    fullDate: "Oct 20 at 9:00 AM",
    isUnread: false,
    avatarColor: "bg-[#10B981] text-white",
    avatarLetter: "L",
    folder: "inbox",
  },
  {
    id: "em-11",
    fromName: "Deepgram Speak",
    fromEmail: "events@deepgram.com",
    subject: "10 days to Deepgram Speak '26",
    preview: "Register now to hear keynote sessions on next-gen streaming voice AI.",
    body: "Save your spot for our annual developer summit on voice AI in patient care.",
    time: "Oct 20",
    fullDate: "Oct 20 at 8:15 AM",
    isUnread: false,
    avatarColor: "bg-[#EC4899] text-white",
    avatarLetter: "DS",
    folder: "inbox",
  },
  {
    id: "em-12",
    fromName: "ChatGPT",
    fromEmail: "updates@openai.com",
    subject: "Turn your hook into a caption",
    preview: "Introducing advanced formatting and system instruction presets in GPT-5.",
    body: "Explore our latest reasoning models tailored for medical summaries and clinical guidelines.",
    time: "Oct 18",
    fullDate: "Oct 18 at 6:45 PM",
    isUnread: false,
    avatarColor: "bg-[#06B6D4] text-white",
    avatarLetter: "CG",
    folder: "inbox",
  },
];

export type EmailFolder = "inbox" | "drafts" | "sent" | "spam" | "trash";

export interface WebmailViewProps {
  searchQuery?: string;
  activeFolder?: EmailFolder;
  onFolderChange?: (folder: EmailFolder) => void;
  onUnreadCountChange?: (count: number) => void;
  onOpenMailboxSettings?: () => void;
  onOpenCrmSettings?: () => void;
}

export default function WebmailView({
  searchQuery = "",
  activeFolder: propActiveFolder,
  onFolderChange: propOnFolderChange,
  onUnreadCountChange,
  onOpenMailboxSettings,
  onOpenCrmSettings,
}: WebmailViewProps) {
  // Master state
  const [emails, setEmails] = useState<EmailItem[]>(INITIAL_EMAILS);
  const [internalActiveFolder, setInternalActiveFolder] = useState<EmailFolder>("inbox");
  const activeFolder = propActiveFolder !== undefined ? propActiveFolder : internalActiveFolder;
  const setActiveFolder = (f: EmailFolder) => {
    setInternalActiveFolder(f);
    propOnFolderChange?.(f);
  };
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  // Drawer & Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeEmailForDrawer, setActiveEmailForDrawer] = useState<EmailItem | null>(null);

  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isSignaturesDrawerOpen, setIsSignaturesDrawerOpen] = useState(false);
  const [isAddSignatureModalOpen, setIsAddSignatureModalOpen] = useState(false);

  // Signatures State
  const [signatures, setSignatures] = useState<EmailSignature[]>(DEFAULT_SIGNATURES);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [sigEditorTitle, setSigEditorTitle] = useState("");
  const [sigEditorBody, setSigEditorBody] = useState("");
  const [sigEditorSender, setSigEditorSender] = useState("All senders");

  // Compose fields
  const [composeFrom, setComposeFrom] = useState("Navodya Jain <navodya@mantra.care>");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Reply state
  const [replyBody, setReplyBody] = useState("");

  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen to global open compose event from topbar
  useEffect(() => {
    const handleGlobalCompose = () => {
      handleOpenCompose();
    };
    window.addEventListener("open-webmail-compose", handleGlobalCompose);
    return () => window.removeEventListener("open-webmail-compose", handleGlobalCompose);
  }, [signatures]);

  // Listen to global open signatures event from topbar gear menu
  useEffect(() => {
    const handleGlobalSignatures = () => {
      setIsSignaturesDrawerOpen(true);
    };
    window.addEventListener("open-webmail-signatures", handleGlobalSignatures);
    return () => window.removeEventListener("open-webmail-signatures", handleGlobalSignatures);
  }, []);

  // Listen to global mark all as read from topbar action menu
  useEffect(() => {
    const handleGlobalMarkAll = () => {
      handleMarkAllAsRead();
    };
    window.addEventListener("mark-all-webmail-read", handleGlobalMarkAll);
    return () => window.removeEventListener("mark-all-webmail-read", handleGlobalMarkAll);
  }, [activeFolder]);

  // Active default signature
  const defaultSignature = useMemo(() => {
    return signatures.find((s) => s.isDefault) || signatures[0] || null;
  }, [signatures]);

  // Handlers
  const handleOpenCompose = () => {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    const sigText = defaultSignature ? `\n\n--\n${defaultSignature.body}` : "";
    setComposeBody(sigText);
    setIsComposeModalOpen(true);
  };

  const handleOpenEmail = (email: EmailItem) => {
    // Mark as read
    if (email.isUnread) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isUnread: false } : e))
      );
    }
    setActiveEmailForDrawer(email);
    const sigText = defaultSignature ? `\n\n--\n${defaultSignature.body}` : "";
    setReplyBody(sigText);
    setIsDrawerOpen(true);
  };

  const handleSendCompose = () => {
    if (!composeTo.trim()) {
      toast.error("Please enter a recipient email address");
      return;
    }
    const newSentEmail: EmailItem = {
      id: `em-sent-${Date.now()}`,
      fromName: "Navodya Jain",
      fromEmail: "navodya@mantra.care",
      subject: composeSubject.trim() || "(No Subject)",
      preview: composeBody.replace(/\n/g, " ").slice(0, 100),
      body: composeBody,
      time: "Just now",
      fullDate: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isUnread: false,
      avatarColor: "bg-[#1E293B] text-white",
      avatarLetter: "NJ",
      folder: "sent",
    };
    setEmails((prev) => [newSentEmail, ...prev]);
    toast.success("Email sent successfully!");
    setIsComposeModalOpen(false);
  };

  const handleSendReply = () => {
    if (!activeEmailForDrawer) return;
    if (!replyBody.trim()) {
      toast.error("Please enter a reply message");
      return;
    }
    const newReplyEmail: EmailItem = {
      id: `em-reply-${Date.now()}`,
      fromName: "Navodya Jain",
      fromEmail: "navodya@mantra.care",
      subject: `Re: ${activeEmailForDrawer.subject}`,
      preview: replyBody.replace(/\n/g, " ").slice(0, 100),
      body: replyBody,
      time: "Just now",
      fullDate: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isUnread: false,
      avatarColor: "bg-[#1E293B] text-white",
      avatarLetter: "NJ",
      folder: "sent",
    };
    setEmails((prev) => [newReplyEmail, ...prev]);
    toast.success(`Reply sent to ${activeEmailForDrawer.fromEmail}`);
    setIsDrawerOpen(false);
  };

  // Bulk operations
  const handleMarkSelectedAsRead = (ids: Set<any>) => {
    setEmails((prev) =>
      prev.map((e) => (ids.has(e.id) ? { ...e, isUnread: false } : e))
    );
    setSelectedEmailIds(new Set());
    toast.success(`Marked ${ids.size} messages as read`);
  };

  const handleMarkSelectedAsSpam = (ids: Set<any>) => {
    setEmails((prev) =>
      prev.map((e) => (ids.has(e.id) ? { ...e, folder: "spam" } : e))
    );
    setSelectedEmailIds(new Set());
    toast.success(`Moved ${ids.size} messages to Spam`);
  };

  const handleDeleteSelected = (ids: Set<any>) => {
    setEmails((prev) =>
      prev.map((e) => (ids.has(e.id) ? { ...e, folder: "trash" } : e))
    );
    setSelectedEmailIds(new Set());
    toast.success(`Moved ${ids.size} messages to Trash`);
  };

  const handleMarkAllAsRead = () => {
    setEmails((prev) =>
      prev.map((e) => (e.folder === activeFolder ? { ...e, isUnread: false } : e))
    );
    toast.success("All messages marked as read");
  };

  // Signature operations
  const handleSetDefaultSignature = (id: string) => {
    setSignatures((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === id,
      }))
    );
    toast.success("Default signature updated");
  };

  const handleDeleteSignature = (id: string) => {
    if (signatures.length <= 1) {
      toast.error("You must have at least one signature");
      return;
    }
    setSignatures((prev) => prev.filter((s) => s.id !== id));
    toast.success("Signature deleted");
  };

  const handleOpenAddSignature = (sigToEdit?: EmailSignature) => {
    if (sigToEdit) {
      setEditingSignature(sigToEdit);
      setSigEditorTitle(sigToEdit.title);
      setSigEditorBody(sigToEdit.body);
      setSigEditorSender(sigToEdit.user);
    } else {
      setEditingSignature(null);
      setSigEditorTitle("Regard, Navodya Jain Product Associate Mantra Care");
      setSigEditorBody("Regard,\nNavodya Jain\nProduct Associate\nMantra Care");
      setSigEditorSender("All senders");
    }
    setIsAddSignatureModalOpen(true);
  };

  const handleSaveSignature = () => {
    if (!sigEditorBody.trim()) {
      toast.error("Signature body cannot be empty");
      return;
    }
    if (editingSignature) {
      setSignatures((prev) =>
        prev.map((s) =>
          s.id === editingSignature.id
            ? { ...s, title: sigEditorTitle || sigEditorBody.split("\n")[0], body: sigEditorBody, user: sigEditorSender }
            : s
        )
      );
      toast.success("Signature updated");
    } else {
      const newSig: EmailSignature = {
        id: `sig-${Date.now()}`,
        title: sigEditorTitle || sigEditorBody.split("\n")[0] || "My Signature",
        body: sigEditorBody,
        user: sigEditorSender,
        isDefault: signatures.length === 0,
      };
      setSignatures([...signatures, newSig]);
      toast.success("Signature created");
    }
    setIsAddSignatureModalOpen(false);
  };

  // Filtered emails based on search and active folder
  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      const matchesFolder = e.folder === activeFolder;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.fromName.toLowerCase().includes(q) ||
        e.fromEmail.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q);
      return matchesFolder && matchesSearch;
    });
  }, [emails, activeFolder, searchQuery]);

  const unreadCount = emails.filter((e) => e.folder === "inbox" && e.isUnread).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  // Table Columns Definition (DESIGN.md Section 3 Table System & Strict Row Sizing)
  const emailColumns: TableColumn<EmailItem>[] = [
    {
      id: "from",
      header: "From",
      align: "left",
      width: "220px",
      render: (email) => (
        <span
          className={`truncate text-xs ${
            email.isUnread ? "font-bold text-[#1E293B]" : "font-medium text-gray-700"
          }`}
        >
          {email.fromName}
        </span>
      ),
    },
    {
      id: "subject",
      header: "Subject & Preview",
      align: "left",
      render: (email) => (
        <div className="flex items-center gap-2 max-w-2xl truncate">
          <span
            className={`truncate ${
              email.isUnread ? "font-bold text-[#1E293B]" : "font-medium text-gray-900"
            }`}
          >
            {email.subject}
          </span>
          <span className="text-gray-400 font-normal truncate hidden sm:inline">
            — {email.preview}
          </span>
        </div>
      ),
    },
    {
      id: "datetime",
      header: "Date & Time",
      align: "right",
      width: "180px",
      render: (email) => (
        <span
          className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {email.fullDate || email.time}
        </span>
      ),
    },
  ];

  const emailRowActions: TableRowAction<EmailItem>[] = [
    {
      label: "Mark as read",
      icon: <Check className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (email) => {
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isUnread: false } : e))
        );
        toast.success("Marked as read");
      },
      hidden: (email) => !email.isUnread,
    },
    {
      label: "Mark as unread",
      icon: <Mail className="w-3.5 h-3.5 text-slate-500" />,
      onClick: (email) => {
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isUnread: true } : e))
        );
        toast.success("Marked as unread");
      },
      hidden: (email) => email.isUnread,
    },
    {
      label: "Move to Trash",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: (email) => {
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, folder: "trash" } : e))
        );
        toast.success("Moved to Trash");
      },
    },
  ];

  const bulkActions: TableBulkAction[] = [
    {
      label: "Read",
      onClick: handleMarkSelectedAsRead,
    },
    {
      label: "Move to folder",
      onClick: () => toast.info("Move to folder dialog opened"),
    },
    {
      label: "Mark as spam",
      onClick: handleMarkSelectedAsSpam,
    },
    {
      label: "Delete",
      isDanger: true,
      onClick: handleDeleteSelected,
    },
  ];

  // Signature Table Columns for Signatures Drawer
  const signatureColumns: TableColumn<EmailSignature>[] = [
    {
      id: "title",
      header: "Signature",
      align: "left",
      render: (sig) => (
        <div className="space-y-0.5 py-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {sig.title}
            </span>
            {sig.isDefault && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-200">
                Default
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 line-clamp-1 whitespace-pre-line font-mono tabular-nums">
            {sig.body}
          </p>
        </div>
      ),
    },
    {
      id: "user",
      header: "Sender / User",
      align: "left",
      width: "180px",
      render: (sig) => (
        <span className="text-xs text-gray-600 font-medium">
          {sig.user}
        </span>
      ),
    },
  ];

  return (
    <>
      <TableComponent<EmailItem>
        data={filteredEmails}
        columns={emailColumns}
        getRowId={(row) => row.id}
        rowActions={emailRowActions}
        enableSelection={true}
        selectedIds={selectedEmailIds}
        onSelectionChange={(ids) => setSelectedEmailIds(ids as Set<string>)}
        bulkActions={bulkActions}
        enableColumnCustomization={true}
        defaultRowsPerPage={20}
        pageSizeOptions={[20, 50, 100]}
        pagination={true}
        onRowClick={(email) => handleOpenEmail(email)}
        emptyMessage={`No messages found in ${activeFolder}.`}
      />

      {/* ── EMAIL DETAIL DRAWER (DESIGN.md Section 7 Profile Drawers Architecture) ── */}
      <Drawer
        isOpen={isDrawerOpen && !!activeEmailForDrawer}
        onClose={() => setIsDrawerOpen(false)}
        maxWidth="sm:max-w-2xl"
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {activeEmailForDrawer?.avatarLetter || "✉"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-[#1E293B] truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                {activeEmailForDrawer?.subject}
              </h3>
              <p className="text-[11px] text-gray-500 truncate font-mono tabular-nums">
                From: {activeEmailForDrawer?.fromName} &lt;{activeEmailForDrawer?.fromEmail}&gt;
              </p>
            </div>
          </div>
        }
      >
        {activeEmailForDrawer && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {/* Clinical Card 1: Sender & Date Metadata (DESIGN.md Section 4.1 Base Card) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${activeEmailForDrawer.avatarColor}`}>
                    {activeEmailForDrawer.avatarLetter}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1E293B]">{activeEmailForDrawer.fromName}</h4>
                    <p className="text-[11px] text-gray-500 font-mono tabular-nums">&lt;{activeEmailForDrawer.fromEmail}&gt;</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    INBOX
                  </span>
                  <span className="text-xs text-gray-500 font-mono tabular-nums">
                    {activeEmailForDrawer.fullDate}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-2 font-medium">
                <span>To: <span className="text-[#1E293B] font-semibold">Navodya Jain &lt;navodya@mantra.care&gt;</span></span>
              </div>

              {/* Action Pills inside Drawer */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => toast.success(`Linked to CRM: ${activeEmailForDrawer.subject}`)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="text-[#1456f0]">⚡</span> CRM Link
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(`Task created: Follow up on ${activeEmailForDrawer.fromName}`)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#10b981]" /> Create Task
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(`Calendar event created: ${activeEmailForDrawer.subject}`)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Schedule Event
                </button>
              </div>
            </div>

            {/* Clinical Card 2: Message Content (DESIGN.md Section 4.1 Base Card) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
              <div className="text-xs leading-relaxed text-gray-800 whitespace-pre-line font-normal space-y-2">
                {activeEmailForDrawer.body}
              </div>
            </div>

            {/* Clinical Card 3: Reply Box with AUTO-RENDERED SIGNATURE (User Prompt 4 requirement) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-[#1456f0]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Quick Reply
                  </h4>
                </div>
                <span className="text-[11px] text-gray-500">
                  Replying to: <span className="font-semibold text-gray-800">{activeEmailForDrawer.fromEmail}</span>
                </span>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 border-b border-gray-100 pb-2 text-slate-500">
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Bold"><Bold className="w-3 h-3" /></button>
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Italic"><Italic className="w-3 h-3" /></button>
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Underline"><Underline className="w-3 h-3" /></button>
                <div className="h-3 w-px bg-gray-200 mx-1" />
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Bullet List"><List className="w-3 h-3" /></button>
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Insert Link"><LinkIcon className="w-3 h-3" /></button>
                <button type="button" className="p-1 rounded hover:bg-slate-100 cursor-pointer" title="Attach file"><Paperclip className="w-3 h-3" /></button>
                <span className="ml-auto text-[10px] text-slate-400 font-medium">Signature auto-rendered</span>
              </div>

              <textarea
                rows={6}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type your reply message here..."
                className="w-full text-xs text-gray-800 focus:outline-none resize-none font-medium leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSendReply}
                  className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Send className="w-3 h-3" />
                  <span>Send Reply</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── COMPOSE EMAIL MODAL (DESIGN.md Section 4 & Modal.tsx) ── */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#1456f0]" />
            <span>Compose Message</span>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* From Selector */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-slate-50">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">From:</span>
            <select
              value={composeFrom}
              onChange={(e) => setComposeFrom(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none text-xs cursor-pointer"
            >
              <option value="Navodya Jain <navodya@mantra.care>">Navodya Jain &lt;navodya@mantra.care&gt;</option>
              <option value="Mantra Care Support <support@mantracare.com>">Mantra Care Support &lt;support@mantracare.com&gt;</option>
              <option value="Billing Department <care@mantracare.com>">Billing Department &lt;care@mantracare.com&gt;</option>
            </select>
          </div>

          {/* To Field with + Add (Screenshot 2) */}
          <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <span className="text-[11px] font-bold text-gray-500 w-10 shrink-0">To:</span>
            <input
              type="email"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="recipient@example.com"
              className="text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1"
            />
            <button
              type="button"
              onClick={() => {
                if (composeTo) setComposeTo((prev) => `${prev}, `);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* CC Field */}
          <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <span className="text-[11px] font-bold text-gray-500 w-10 shrink-0">CC:</span>
            <input
              type="email"
              value={composeCc}
              onChange={(e) => setComposeCc(e.target.value)}
              placeholder="Add CC recipients (optional)"
              className="text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1"
            />
          </div>

          {/* Subject Field */}
          <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <span className="text-[11px] font-bold text-gray-500 w-14 shrink-0">Subject:</span>
            <input
              type="text"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Enter message subject"
              className="text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1"
            />
          </div>

          {/* Rich Editor Toolbar matching Screenshot 2 */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1.5 flex-wrap text-slate-600">
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
              <div className="h-3.5 w-px bg-gray-300 mx-1" />
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
              <div className="h-3.5 w-px bg-gray-300 mx-1" />
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Link"><LinkIcon className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Attach file"><Paperclip className="w-3.5 h-3.5" /></button>

              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#1456f0] font-semibold">
                <FileEdit className="w-3 h-3" />
                <span>Signature auto-rendered</span>
              </div>
            </div>

            {/* Email Body with AUTO-RENDERED SIGNATURE (Prompt 4 requirement) */}
            <textarea
              rows={8}
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Write your email message here..."
              className="w-full p-4 text-xs text-gray-800 focus:outline-none resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Modal Footer (DESIGN.md Section 7.2 Cancel & Commit Buttons) */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsComposeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendCompose}
              className="px-5 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── SIGNATURES DRAWER (DESIGN.md Section 7 Profile Drawers Architecture) ── */}
      <Drawer
        isOpen={isSignaturesDrawerOpen}
        onClose={() => setIsSignaturesDrawerOpen(false)}
        maxWidth="sm:max-w-2xl"
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <FileEdit className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Signatures
              </h3>
              <p className="text-[11px] text-gray-500">
                Manage email signatures automatically appended to outbound messages.
              </p>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {/* Subtle greyish "+ Add Signature" button (DESIGN.md Section 5.1) */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleOpenAddSignature()}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Signature
            </button>
          </div>

          {/* Signatures List using TableComponent (DESIGN.md Section 3) */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <TableComponent<EmailSignature>
              data={signatures}
              columns={signatureColumns}
              getRowId={(row) => row.id}
              enableSelection={false}
              enableColumnCustomization={false}
              pagination={false}
              onRowClick={(sig) => handleOpenAddSignature(sig)}
              emptyMessage="No signatures defined."
              className="border-none shadow-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
            <p className="font-semibold mb-0.5">ℹ Auto-render behavior</p>
            <p className="text-blue-800">
              The default signature is automatically rendered into every new message compose window and reply thread.
            </p>
          </div>
        </div>
      </Drawer>

      {/* ── ADD / EDIT SIGNATURE MODAL ── */}
      <Modal
        isOpen={isAddSignatureModalOpen}
        onClose={() => setIsAddSignatureModalOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[#1456f0]" />
            <span>{editingSignature ? "Edit signature" : "Add signature"}</span>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Rich Editor Toolbar matching Screenshot 4 */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1.5 flex-wrap text-slate-600">
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
              <div className="h-3.5 w-px bg-gray-300 mx-1" />
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 rounded hover:bg-slate-200 cursor-pointer" title="Link"><LinkIcon className="w-3.5 h-3.5" /></button>
            </div>

            <textarea
              rows={6}
              value={sigEditorBody}
              onChange={(e) => setSigEditorBody(e.target.value)}
              placeholder="Regard,&#10;Navodya Jain&#10;Product Associate&#10;Mantra Care"
              className="w-full p-3.5 text-xs text-gray-800 focus:outline-none resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Sender / User Selector (Screenshot 4) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
              Sender
            </label>
            <select
              value={sigEditorSender}
              onChange={(e) => setSigEditorSender(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All senders">All senders</option>
              <option value="navodya@mantra.care">navodya@mantra.care</option>
              <option value="eyemantra0@gmail.com">eyemantra0@gmail.com</option>
              <option value="support@mantracare.com">support@mantracare.com</option>
            </select>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddSignatureModalOpen(false)}
              className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveSignature}
              className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Signature</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
