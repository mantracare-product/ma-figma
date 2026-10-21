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
  PenLine,
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
  Eye,
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
import { getStoredClients } from "../../../lib/clientsStore";
import { getContactCategories } from "../../../lib/contactCategoriesStore";
import DocumentSelectFieldsModal from "../ui/DocumentSelectFieldsModal";

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type?: string;
}

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
  attachments?: EmailAttachment[];
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
    title: "Navodya Jain - Product Associate",
    body: "Regard,\nNavodya Jain\nProduct Associate\nMantra Care",
    user: "navodya@mantra.care",
    isDefault: true,
  },
  {
    id: "sig-2",
    title: "Mantra Care Support Operations",
    body: "Warm regards,\nSupport Operations Desk\nMantra Care Support Team\nhttps://mantra.care",
    user: "support@mantracare.com",
    isDefault: true,
  },
  {
    id: "sig-3",
    title: "Billing & Patient Accounts",
    body: "Sincerely,\nBilling & Patient Accounts Team\ncare@mantracare.com",
    user: "care@mantracare.com",
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
    attachments: [
      { id: "att-1", name: "Consultation_Prep_Guide.pdf", size: "340 KB", type: "application/pdf" },
      { id: "att-2", name: "Patient_Intake_Assessment.docx", size: "128 KB", type: "application/docx" },
    ],
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
  const [sigEditorMode, setSigEditorMode] = useState<"rich" | "html">("rich");
  const [sigHtmlTab, setSigHtmlTab] = useState<"code" | "preview">("code");
  const sigTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sigImageInputRef = useRef<HTMLInputElement>(null);

  // Compose fields
  const [composeFrom, setComposeFrom] = useState("Navodya Jain <navodya@mantra.care>");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeBodyMode, setComposeBodyMode] = useState<"rich" | "html">("rich");
  const [composeHtmlTab, setComposeHtmlTab] = useState<"code" | "preview">("code");
  const [composeSignatureId, setComposeSignatureId] = useState<string>("sig-1");
  const [isSigDropdownOpen, setIsSigDropdownOpen] = useState(false);
  const sigDropdownRef = useRef<HTMLDivElement>(null);
  const [appliedSignatureText, setAppliedSignatureText] = useState<string>("");
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);

  // Contact picker state for Compose "To:" field
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState("Lead");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const contactPickerRef = useRef<HTMLDivElement>(null);

  const allClients = useMemo(() => getStoredClients(), [isComposeModalOpen]);
  const contactCategories = useMemo(
    () => getContactCategories().filter((c) => c.toLowerCase() !== "all"),
    []
  );

  const filteredContacts = useMemo(() => {
    return allClients.filter((c) => {
      const cat = c.contactType || c.contact_type || "Client";
      const matchesCategory =
        !contactCategoryFilter ||
        contactCategoryFilter === "All" ||
        cat.toLowerCase() === contactCategoryFilter.toLowerCase();
      const q = contactSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q));
      return matchesCategory && matchesSearch && !!c.email;
    });
  }, [allClients, contactCategoryFilter, contactSearchQuery]);

  const areAllFilteredSelected = useMemo(() => {
    if (filteredContacts.length === 0) return false;
    const currentEmails = composeTo
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return filteredContacts.every((c) => currentEmails.includes(c.email.toLowerCase()));
  }, [filteredContacts, composeTo]);

  const handleToggleSelectAll = () => {
    const currentEmails = composeTo
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (areAllFilteredSelected) {
      const filteredEmailsLower = filteredContacts.map((c) => c.email.toLowerCase());
      const remaining = currentEmails.filter(
        (e) => !filteredEmailsLower.includes(e.toLowerCase())
      );
      setComposeTo(remaining.join(", "));
    } else {
      const currentEmailsLower = currentEmails.map((e) => e.toLowerCase());
      const toAdd = filteredContacts
        .filter((c) => !currentEmailsLower.includes(c.email.toLowerCase()))
        .map((c) => c.email);
      setComposeTo([...currentEmails, ...toAdd].join(", "));
    }
  };

  const handleToggleContactEmail = (email: string) => {
    if (!email) return;
    const currentEmails = composeTo
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (currentEmails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setComposeTo(currentEmails.filter((e) => e.toLowerCase() !== email.toLowerCase()).join(", "));
    } else {
      setComposeTo([...currentEmails, email].join(", "));
    }
  };

  // Variable selector state for Compose
  const [isComposeVariableModalOpen, setIsComposeVariableModalOpen] = useState(false);
  const [composeVariableTarget, setComposeVariableTarget] = useState<"subject" | "body">("body");
  const composeSubjectRef = useRef<HTMLInputElement>(null);
  const composeBodyRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertComposeVariable = (token: string) => {
    if (composeVariableTarget === "subject") {
      const input = composeSubjectRef.current;
      if (input) {
        const start = input.selectionStart ?? composeSubject.length;
        const end = input.selectionEnd ?? composeSubject.length;
        const next = composeSubject.slice(0, start) + token + composeSubject.slice(end);
        setComposeSubject(next);
        setTimeout(() => {
          input.focus();
          const pos = start + token.length;
          input.setSelectionRange(pos, pos);
        }, 0);
      } else {
        setComposeSubject((prev) => (prev ? prev + " " + token : token));
      }
    } else {
      const textarea = composeBodyRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? composeBody.length;
        const end = textarea.selectionEnd ?? composeBody.length;
        const next = composeBody.slice(0, start) + token + composeBody.slice(end);
        setComposeBody(next);
        setTimeout(() => {
          textarea.focus();
          const pos = start + token.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
      } else {
        setComposeBody((prev) => (prev ? prev + " " + token : token));
      }
    }
    toast.success(`Inserted ${token}`);
  };

  const applyComposeFormat = (prefix: string, suffix: string, defaultText = "text") => {
    const textarea = composeBodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = composeBody.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newBody = composeBody.substring(0, start) + replacement + composeBody.substring(end);
    setComposeBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const applyComposeList = (ordered = false) => {
    const textarea = composeBodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = composeBody.substring(start, end);
    if (selected) {
      const lines = selected.split("\n");
      const formatted = lines.map((l, i) => (ordered ? `${i + 1}. ${l}` : `• ${l}`)).join("\n");
      const newBody = composeBody.substring(0, start) + formatted + composeBody.substring(end);
      setComposeBody(newBody);
    } else {
      const bullet = ordered ? "\n1. Item 1\n2. Item 2\n" : "\n• Item 1\n• Item 2\n";
      setComposeBody((prev) => (prev ? prev + bullet : bullet));
    }
  };

  const applyComposeLink = () => {
    const url = window.prompt("Enter link URL:", "https://");
    if (!url) return;
    applyComposeFormat(`<a href="${url}" target="_blank" style="color: #1456f0; text-decoration: underline;">`, "</a>", "link text");
  };

  const handleInsertComposeHtmlTemplate = () => {
    const htmlTemplate = `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.6;">
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Thank you for reaching out to <strong>Mantra Care</strong>.</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
    <strong style="color: #0284c7;">Summary Details:</strong><br />
    Date: <strong>{{appointment_date}}</strong> at <strong>{{appointment_time}}</strong><br />
    Provider: <strong>{{doctor_name}}</strong>
  </div>
  <p>Please let us know if you have any questions.</p>
  <p>Warm regards,<br /><strong>Mantra Care Team</strong></p>
</div>`;
    setComposeBody((prev) => (prev ? prev + "\n\n" + htmlTemplate : htmlTemplate));
    toast.success("HTML block template inserted into message body");
  };

  // Reply state
  const [replyBody, setReplyBody] = useState("");

  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
      if (contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
        setIsContactPickerOpen(false);
      }
      if (sigDropdownRef.current && !sigDropdownRef.current.contains(e.target as Node)) {
        setIsSigDropdownOpen(false);
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

  // Sender email and available signatures for that email account
  const senderEmail = useMemo(() => {
    const match = composeFrom.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase().trim() : composeFrom.toLowerCase().trim();
  }, [composeFrom]);

  const availableSignaturesForSender = useMemo(() => {
    const filtered = signatures.filter((s) => {
      if (!s.user || s.user === "All senders" || s.user === "All users") return true;
      return s.user.toLowerCase() === senderEmail;
    });
    return filtered.length > 0 ? filtered : signatures;
  }, [signatures, senderEmail]);

  // Active default signature
  const defaultSignature = useMemo(() => {
    return availableSignaturesForSender.find((s) => s.isDefault) || availableSignaturesForSender[0] || null;
  }, [availableSignaturesForSender]);

  const handleApplySignatureToCompose = (signatureId: string) => {
    setComposeSignatureId(signatureId);
    if (signatureId === "none") {
      if (appliedSignatureText) {
        setComposeBody((prev) => prev.replace(appliedSignatureText, "").trimEnd());
        setAppliedSignatureText("");
      }
      toast.info("Signature removed");
      return;
    }

    const selectedSig = signatures.find((s) => s.id === signatureId);
    if (!selectedSig) return;

    const newSigText = `\n\n--\n${selectedSig.body}`;
    if (appliedSignatureText && composeBody.includes(appliedSignatureText)) {
      setComposeBody((prev) => prev.replace(appliedSignatureText, newSigText));
    } else {
      setComposeBody((prev) => (prev ? prev.trimEnd() + newSigText : selectedSig.body));
    }
    setAppliedSignatureText(newSigText);
    toast.success(`Signature applied: ${selectedSig.title}`);
  };

  const renderSignatureDropdown = (alignRight = true) => (
    <div className={`relative ${alignRight ? "ml-auto" : ""}`} ref={sigDropdownRef}>
      <button
        type="button"
        onClick={() => setIsSigDropdownOpen((prev) => !prev)}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
          isSigDropdownOpen || (composeSignatureId && composeSignatureId !== "none")
            ? "bg-slate-100 border-slate-300 text-slate-900 shadow-2xs"
            : "border-transparent hover:bg-slate-200 text-slate-600"
        }`}
        title="Choose email signature"
      >
        <PenLine className="w-3.5 h-3.5" />
      </button>

      {isSigDropdownOpen && (
        <div
          className={`absolute ${
            alignRight ? "right-0" : "left-0"
          } top-full mt-1.5 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-1.5 z-50 text-xs text-[#1E293B] space-y-0.5`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Signatures
          </div>

          <button
            type="button"
            onClick={() => {
              handleApplySignatureToCompose("none");
              setIsSigDropdownOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
          >
            <span className={composeSignatureId === "none" ? "font-semibold text-slate-900" : "text-slate-600"}>
              None (No signature)
            </span>
            {composeSignatureId === "none" && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
          </button>

          {availableSignaturesForSender.map((sig) => {
            const isSelected = composeSignatureId === sig.id;
            return (
              <button
                key={sig.id}
                type="button"
                onClick={() => {
                  handleApplySignatureToCompose(sig.id);
                  setIsSigDropdownOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="truncate pr-2">
                  <span className={`block truncate ${isSelected ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                    {sig.title}
                  </span>
                  {sig.isDefault && <span className="text-[10px] text-gray-400 font-medium">Default</span>}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
              </button>
            );
          })}

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={() => {
              setIsSigDropdownOpen(false);
              setIsSignaturesDrawerOpen(true);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-black flex items-center justify-between cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
              Manage signatures
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );

  const handleFromChange = (newFrom: string) => {
    setComposeFrom(newFrom);
    const match = newFrom.match(/<([^>]+)>/);
    const newEmail = match ? match[1].toLowerCase().trim() : newFrom.toLowerCase().trim();
    const available = signatures.filter(
      (s) => !s.user || s.user === "All senders" || s.user === "All users" || s.user.toLowerCase() === newEmail
    );
    const matchingSig = available.find((s) => s.isDefault) || available[0] || null;
    if (matchingSig) {
      handleApplySignatureToCompose(matchingSig.id);
    } else {
      handleApplySignatureToCompose("none");
    }
  };

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments: EmailAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: f.name,
      size:
        f.size > 1024 * 1024
          ? (f.size / (1024 * 1024)).toFixed(1) + " MB"
          : Math.max(1, Math.round(f.size / 1024)) + " KB",
      type: f.type || "file",
    }));
    setComposeAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`Attached ${files.length} file${files.length > 1 ? "s" : ""}`);
    if (composeFileInputRef.current) {
      composeFileInputRef.current.value = "";
    }
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const newAttachments: EmailAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: f.name,
      size:
        f.size > 1024 * 1024
          ? (f.size / (1024 * 1024)).toFixed(1) + " MB"
          : Math.max(1, Math.round(f.size / 1024)) + " KB",
      type: f.type || "file",
    }));
    setComposeAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`Attached ${files.length} file${files.length > 1 ? "s" : ""}`);
  };

  const handleRemoveAttachment = (id: string) => {
    setComposeAttachments((prev) => prev.filter((a) => a.id !== id));
    toast.info("Attachment removed");
  };

  // Handlers
  const handleOpenCompose = () => {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeAttachments([]);

    const match = composeFrom.match(/<([^>]+)>/);
    const curSenderEmail = match ? match[1].toLowerCase().trim() : composeFrom.toLowerCase().trim();
    const available = signatures.filter(
      (s) => !s.user || s.user === "All senders" || s.user === "All users" || s.user.toLowerCase() === curSenderEmail
    );
    const initialSig = available.find((s) => s.isDefault) || available[0] || null;
    if (initialSig) {
      const sigText = `\n\n--\n${initialSig.body}`;
      setComposeBody(sigText);
      setComposeSignatureId(initialSig.id);
      setAppliedSignatureText(sigText);
    } else {
      setComposeBody("");
      setComposeSignatureId("none");
      setAppliedSignatureText("");
    }
    setComposeBodyMode("rich");
    setComposeHtmlTab("code");
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
      attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
    };
    const isContactFound = allClients.some(
      (c) => c.email && composeTo.toLowerCase().includes(c.email.toLowerCase())
    );
    setEmails((prev) => [newSentEmail, ...prev]);
    toast.success(`Email sent to ${composeTo.trim()}${!isContactFound ? " (external recipient)" : ""}`);
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

  const insertAtSigCursor = (textToInsert: string) => {
    const textarea = sigTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? sigEditorBody.length;
      const end = textarea.selectionEnd ?? sigEditorBody.length;
      const updated = sigEditorBody.slice(0, start) + textToInsert + sigEditorBody.slice(end);
      setSigEditorBody(updated);
      setTimeout(() => {
        textarea.focus();
        const pos = start + textToInsert.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    } else {
      setSigEditorBody((prev) => (prev ? prev + "\n" + textToInsert : textToInsert));
    }
  };

  const applySigFormat = (prefix: string, suffix: string, defaultText = "text") => {
    const textarea = sigTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = sigEditorBody.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newBody = sigEditorBody.substring(0, start) + replacement + sigEditorBody.substring(end);
    setSigEditorBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const applySigList = (ordered = false) => {
    const textarea = sigTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = sigEditorBody.substring(start, end);
    if (selected) {
      const lines = selected.split("\n");
      const formatted = lines.map((l, i) => (ordered ? `${i + 1}. ${l}` : `• ${l}`)).join("\n");
      const newBody = sigEditorBody.substring(0, start) + formatted + sigEditorBody.substring(end);
      setSigEditorBody(newBody);
    } else {
      const bullet = ordered ? "\n1. Item 1\n2. Item 2\n" : "\n• Item 1\n• Item 2\n";
      insertAtSigCursor(bullet);
    }
  };

  const applySigLink = () => {
    const url = window.prompt("Enter link URL:", "https://");
    if (!url) return;
    applySigFormat(`<a href="${url}" target="_blank" style="color: #1456f0; text-decoration: underline;">`, "</a>", "link text");
  };

  const handleSigImageClick = () => {
    const choice = window.prompt("Enter image URL (or click Cancel / leave empty to upload from computer):", "");
    if (choice && choice.trim()) {
      insertAtSigCursor(`\n<img src="${choice.trim()}" alt="Signature Logo" style="max-height: 50px; display: block; margin: 8px 0;" />\n`);
      toast.success("Image URL inserted");
    } else if (choice === "") {
      sigImageInputRef.current?.click();
    }
  };

  const handleSigImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const imgTag = `\n<img src="${dataUrl}" alt="Signature Logo" style="max-height: 50px; display: block; margin: 8px 0;" />\n`;
      insertAtSigCursor(imgTag);
      toast.success("Image added to signature");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInsertHtmlBlock = () => {
    const htmlTemplate = `<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin-top: 10px;">
  <tr>
    <td style="padding-right: 12px; vertical-align: middle; border-right: 2px solid #0284c7;">
      <strong style="font-size: 14px; color: #0284c7;">MantraCare</strong>
    </td>
    <td style="padding-left: 12px; vertical-align: middle; line-height: 1.5;">
      <strong style="font-size: 13px; color: #0f172a;">Navodya Jain</strong><br />
      <span style="color: #64748b; font-size: 11px;">Product Associate</span><br />
      <a href="https://mantra.care" style="color: #0284c7; text-decoration: none; font-size: 11px;">www.mantra.care</a>
    </td>
  </tr>
</table>`;
    setSigEditorBody(htmlTemplate);
    toast.success("HTML block template inserted");
  };

  const handleOpenAddSignature = (sigToEdit?: EmailSignature) => {
    if (sigToEdit) {
      setEditingSignature(sigToEdit);
      setSigEditorTitle(sigToEdit.title);
      setSigEditorBody(sigToEdit.body);
      setSigEditorSender(sigToEdit.user);
      const isHtml = sigToEdit.body.includes("<") && sigToEdit.body.includes(">");
      setSigEditorMode(isHtml ? "html" : "rich");
    } else {
      setEditingSignature(null);
      setSigEditorTitle("Corporate Signature");
      setSigEditorBody("Regard,\nNavodya Jain\nProduct Associate\nMantra Care");
      setSigEditorSender("All senders");
      setSigEditorMode("rich");
    }
    setSigHtmlTab("code");
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
            ? { ...s, title: sigEditorTitle.trim() || sigEditorBody.split("\n")[0] || "Signature", body: sigEditorBody, user: sigEditorSender }
            : s
        )
      );
      toast.success("Signature updated");
    } else {
      const newSig: EmailSignature = {
        id: `sig-${Date.now()}`,
        title: sigEditorTitle.trim() || sigEditorBody.split("\n")[0] || "My Signature",
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
          {email.attachments && email.attachments.length > 0 && (
            <span title={`${email.attachments.length} attachment(s)`} className="inline-flex items-center">
              <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </span>
          )}
          <span className="text-gray-400 font-normal truncate hidden sm:inline">
            — {email.preview}
          </span>
        </div>
      ),
    },
    {
      id: "date",
      header: "Date",
      align: "right",
      width: "110px",
      render: (email) => {
        let datePart = email.fullDate || "Today";
        if (datePart.includes(" at ")) {
          datePart = datePart.split(" at ")[0].trim();
        }
        return (
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            {datePart}
          </span>
        );
      },
    },
    {
      id: "time",
      header: "Time",
      align: "right",
      width: "95px",
      render: (email) => {
        let timePart = email.time || "12:00 PM";
        if (email.fullDate && email.fullDate.includes(" at ")) {
          timePart = email.fullDate.split(" at ")[1].trim();
        }
        return (
          <span
            className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {timePart}
          </span>
        );
      },
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

  const signatureRowActions: TableRowAction<EmailSignature>[] = [
    {
      label: "Edit",
      icon: <FileEdit className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (sig) => handleOpenAddSignature(sig),
    },
    {
      label: "Set as Default",
      icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (sig) => handleSetDefaultSignature(sig.id),
      hidden: (sig) => !!sig.isDefault,
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: (sig) => handleDeleteSignature(sig.id),
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
              {activeEmailForDrawer.body.includes("<") && activeEmailForDrawer.body.includes(">") ? (
                <div
                  className="text-xs leading-relaxed text-gray-800 font-normal space-y-2 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: activeEmailForDrawer.body }}
                />
              ) : (
                <div className="text-xs leading-relaxed text-gray-800 whitespace-pre-line font-normal space-y-2">
                  {activeEmailForDrawer.body}
                </div>
              )}
            </div>

            {/* Attachments Card if email has attachments */}
            {activeEmailForDrawer.attachments && activeEmailForDrawer.attachments.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Paperclip className="w-3.5 h-3.5 text-[#1456f0]" />
                  <span>Attachments ({activeEmailForDrawer.attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeEmailForDrawer.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-[#1456f0] flex items-center justify-center shrink-0">
                          <Paperclip className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{att.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{att.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast.success(`Downloading ${att.name}...`)}
                        className="text-[11px] font-semibold text-[#1456f0] hover:underline cursor-pointer ml-2 shrink-0"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* ── COMPOSE EMAIL DRAWER ── */}
      <Drawer
        isOpen={isComposeModalOpen}
        onClose={() => {
          setIsComposeModalOpen(false);
          setIsContactPickerOpen(false);
        }}
        maxWidth="sm:max-w-2xl"
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center font-bold text-sm shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Compose Message
              </h3>
              <p className="text-[11px] text-gray-500">
                Draft and send an outbound email
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsComposeModalOpen(false);
                  setIsContactPickerOpen(false);
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </button>
            </div>

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
        }
      >
        <div className="p-6 space-y-4 text-xs overflow-visible" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {/* From Selector */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-slate-50">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">From:</span>
            <select
              value={composeFrom}
              onChange={(e) => handleFromChange(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none text-xs cursor-pointer"
            >
              <option value="Navodya Jain <navodya@mantra.care>">Navodya Jain &lt;navodya@mantra.care&gt;</option>
              <option value="Mantra Care Support <support@mantracare.com>">Mantra Care Support &lt;support@mantracare.com&gt;</option>
              <option value="Billing Department <care@mantracare.com>">Billing Department &lt;care@mantracare.com&gt;</option>
            </select>
          </div>

          {/* To Field with Contact Suggestions & Free-form Email Entry */}
          <div className="relative" ref={contactPickerRef}>
            <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <span className="text-[11px] font-bold text-gray-500 w-10 shrink-0">To:</span>
              <input
                type="text"
                value={composeTo}
                onChange={(e) => {
                  setComposeTo(e.target.value);
                  setIsContactPickerOpen(true);
                }}
                onFocus={() => setIsContactPickerOpen(true)}
                placeholder="Select contact or type any email address..."
                className="text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1 pr-2"
              />
              <button
                type="button"
                onClick={() => setIsContactPickerOpen((prev) => !prev)}
                className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:bg-blue-50/80 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                style={{ fontFamily: "Outfit, sans-serif" }}
                title="Select contacts from CRM"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Contact Selector Popup with Category Filters + Free-form Send option */}
            {isContactPickerOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
                style={{ zIndex: 10001 }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1456f0]" />
                    <span className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Select from Contacts
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">({filteredContacts.length})</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {filteredContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        {areAllFilteredSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsContactPickerOpen(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact Search Input + Category Filter Dropdown side-by-side */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by contact name or email..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                    />
                  </div>

                  <select
                    value={contactCategoryFilter}
                    onChange={(e) => setContactCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer shrink-0"
                  >
                    {contactCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="All">All Categories</option>
                  </select>
                </div>

                {/* Contact List */}
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100 bg-slate-50/40">
                  {filteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No contacts found matching &quot;{contactSearchQuery}&quot;{contactCategoryFilter ? ` in ${contactCategoryFilter}` : ""}.
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSelected = composeTo
                        .split(",")
                        .map((e) => e.trim().toLowerCase())
                        .includes(contact.email.toLowerCase());

                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => handleToggleContactEmail(contact.email)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50/60 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50/90 text-[#1456f0]" : "text-[#1E293B]"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-xs truncate text-slate-900">{contact.name}</div>
                            <p className="text-[11px] text-gray-500 font-mono truncate">{contact.email}</p>
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-[#1456f0] shrink-0" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    {filteredContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        {areAllFilteredSelected ? "Deselect All" : `Select All (${filteredContacts.length})`}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsContactPickerOpen(false)}
                    className="text-xs font-bold text-[#1456f0] hover:underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
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

          {/* Subject Field with Insert Variable button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subject</span>
              <button
                type="button"
                onClick={() => {
                  setComposeVariableTarget("subject");
                  setIsComposeVariableModalOpen(true);
                }}
                className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span className="font-mono">{`{ }`}</span>
                <span>Insert Variable</span>
              </button>
            </div>
            <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <input
                ref={composeSubjectRef}
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter message subject"
                className="text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1"
              />
            </div>
          </div>

          {/* Body Field with Mode Switcher & Insert Variable */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Body</span>
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setComposeBodyMode("rich")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all ${
                      composeBodyMode === "rich"
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
                      setComposeBodyMode("html");
                      setComposeHtmlTab("code");
                    }}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all ${
                      composeBodyMode === "html"
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
                  setComposeVariableTarget("body");
                  setIsComposeVariableModalOpen(true);
                }}
                className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span className="font-mono">{`{ }`}</span>
                <span>Insert Variable</span>
              </button>
            </div>

            {/* Container for Rich Editor or HTML Block */}
            {composeBodyMode === "rich" ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1.5 flex-wrap text-slate-600">
                  <button
                    type="button"
                    onClick={() => applyComposeFormat("<b>", "</b>", "Bold text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComposeFormat("<i>", "</i>", "Italic text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComposeFormat("<u>", "</u>", "Underlined text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComposeFormat("<s>", "</s>", "Strikethrough text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-gray-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => applyComposeList(false)}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComposeList(true)}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={applyComposeLink}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  {renderSignatureDropdown(true)}
                </div>

                {/* Email Body with AUTO-RENDERED SIGNATURE */}
                <textarea
                  ref={composeBodyRef}
                  rows={10}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your email message here..."
                  className="w-full p-4 text-xs text-gray-800 focus:outline-none resize-y font-medium leading-relaxed font-sans"
                />
              </div>
            ) : (
              /* HTML Block mode with preview in HTML block only */
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <Code className="w-3.5 h-3.5 text-indigo-600" />
                      <span>HTML Email Body</span>
                    </div>

                    {renderSignatureDropdown(false)}
                  </div>

                  <div className="inline-flex items-center p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setComposeHtmlTab("code")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        composeHtmlTab === "code"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeHtmlTab("preview")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all ${
                        composeHtmlTab === "preview"
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

                {composeHtmlTab === "code" ? (
                  <div className="relative">
                    <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-mono">Write or paste HTML code</span>
                      <button
                        type="button"
                        onClick={handleInsertComposeHtmlTemplate}
                        className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Insert HTML Template
                      </button>
                    </div>
                    <textarea
                      ref={composeBodyRef}
                      rows={10}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="<div>...</div>"
                      className="w-full p-4 text-xs text-slate-800 font-mono bg-slate-50/30 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="p-5 bg-white min-h-[180px] text-xs text-slate-800 leading-relaxed overflow-x-auto">
                    {composeBody.trim() ? (
                      <div dangerouslySetInnerHTML={{ __html: composeBody }} />
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        No HTML content to preview. Switch to HTML tab to write code.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Attachments Section below body */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                    <span>Attachments</span>
                  </span>
                  {composeAttachments.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                      {composeAttachments.length} {composeAttachments.length === 1 ? "file" : "files"}
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={composeFileInputRef}
                  multiple
                  onChange={handleAttachFiles}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => composeFileInputRef.current?.click()}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Files</span>
                </button>
              </div>

              {composeAttachments.length === 0 ? (
                <div
                  onClick={() => composeFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFiles}
                  className="border border-dashed border-gray-200 hover:border-slate-300 rounded-xl p-3 text-center bg-slate-50/50 hover:bg-slate-100/60 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-500"
                >
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span>
                    <strong className="text-slate-700">Click to attach files</strong> or drag and drop here (PDF, DOCX, images, reports)
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {composeAttachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Paperclip className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{file.size}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(file.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 ml-1"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => composeFileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add more files</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>

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
          {/* Subtle greyish "+ Add Signature" button */}
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

          {/* Signatures List using TableComponent with standard sharp corners */}
          <TableComponent<EmailSignature>
            data={signatures}
            columns={signatureColumns}
            getRowId={(row) => row.id}
            rowActions={signatureRowActions}
            enableSelection={false}
            enableColumnCustomization={false}
            pagination={false}
            onRowClick={(sig) => handleOpenAddSignature(sig)}
            emptyMessage="No signatures defined."
            className="rounded-none border border-gray-200"
          />

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
            <p className="font-semibold mb-0.5">ℹ Auto-render behavior</p>
            <p className="text-blue-800">
              The default signature is automatically rendered into every new message compose window and reply thread.
            </p>
          </div>
        </div>
      </Drawer>

      {/* ── ADD / EDIT SIGNATURE DRAWER (Sits in front with higher zIndex and narrower width) ── */}
      <Drawer
        isOpen={isAddSignatureModalOpen}
        onClose={() => setIsAddSignatureModalOpen(false)}
        maxWidth="sm:max-w-md"
        zIndex={10005}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center font-bold text-sm shadow-2xs">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                {editingSignature ? "Edit Signature" : "Add Signature"}
              </h3>
              <p className="text-[11px] text-gray-500">
                {editingSignature ? "Update your outbound signature" : "Create a new outbound signature"}
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsAddSignatureModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveSignature}
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Signature</span>
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-4 text-xs">
          {/* Signature Name above the editor */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
              Signature Name
            </label>
            <input
              type="text"
              value={sigEditorTitle}
              onChange={(e) => setSigEditorTitle(e.target.value)}
              placeholder="e.g. Corporate Signature, Sales Team"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={sigImageInputRef}
            accept="image/*"
            onChange={handleSigImageUpload}
            className="hidden"
          />

          {/* Mode Selector: Rich Editor vs HTML Block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                Signature Content
              </label>

              {/* Segmented Mode Switcher: Rich Editor vs HTML Block */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSigEditorMode("rich")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                    sigEditorMode === "rich"
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
                    setSigEditorMode("html");
                    setSigHtmlTab("code");
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                    sigEditorMode === "html"
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  HTML Block
                </button>
              </div>
            </div>

            {/* Container for Rich Editor or HTML Block */}
            {sigEditorMode === "rich" ? (
              /* ── 1. RICH EDITOR MODE (No preview tab here, direct WYSIWYG/rich formatting) ── */
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1.5 flex-wrap text-slate-600">
                  <button
                    type="button"
                    onClick={() => applySigFormat("<b>", "</b>", "Bold text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applySigFormat("<i>", "</i>", "Italic text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applySigFormat("<u>", "</u>", "Underlined text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applySigFormat("<s>", "</s>", "Strikethrough text")}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-gray-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => applySigList(false)}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applySigList(true)}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={applySigLink}
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-gray-300 mx-1" />

                  {/* Add Image Button in Rich Editor */}
                  <button
                    type="button"
                    onClick={handleSigImageClick}
                    className="px-2 py-0.5 rounded hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Add Image or Logo"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Image</span>
                  </button>
                </div>

                <textarea
                  ref={sigTextareaRef}
                  rows={8}
                  value={sigEditorBody}
                  onChange={(e) => setSigEditorBody(e.target.value)}
                  placeholder="Regard,&#10;Navodya Jain&#10;Product Associate&#10;Mantra Care"
                  className="w-full p-3.5 text-xs text-gray-800 focus:outline-none resize-y font-medium leading-relaxed font-sans"
                />
              </div>
            ) : (
              /* ── 2. HTML BLOCK MODE (Preview tab shown here only) ── */
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {/* HTML Block Header with Sub-tabs: HTML Source vs Live Preview */}
                <div className="px-3 py-2 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <Code className="w-3.5 h-3.5 text-indigo-600" />
                    <span>HTML Signature Template</span>
                  </div>

                  <div className="inline-flex items-center p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSigHtmlTab("code")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        sigHtmlTab === "code"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigHtmlTab("preview")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all ${
                        sigHtmlTab === "preview"
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

                {sigHtmlTab === "code" ? (
                  <div className="relative">
                    <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-mono">Write or paste HTML source</span>
                      <button
                        type="button"
                        onClick={handleInsertHtmlBlock}
                        className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Reset / Insert Template
                      </button>
                    </div>
                    <textarea
                      ref={sigTextareaRef}
                      rows={10}
                      value={sigEditorBody}
                      onChange={(e) => setSigEditorBody(e.target.value)}
                      placeholder="<table>...</table>"
                      className="w-full p-3.5 text-xs text-slate-800 font-mono bg-slate-50/30 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>
                ) : (
                  /* Live Preview in HTML Block only */
                  <div className="p-5 bg-white min-h-[180px] text-xs text-slate-800 leading-relaxed overflow-x-auto">
                    {sigEditorBody.trim() ? (
                      <div dangerouslySetInnerHTML={{ __html: sigEditorBody }} />
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        No HTML content to preview. Switch to HTML tab and enter code.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sender / User Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
              Sender
            </label>
            <select
              value={sigEditorSender}
              onChange={(e) => setSigEditorSender(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="All senders">All senders</option>
              <option value="navodya@mantra.care">navodya@mantra.care</option>
              <option value="eyemantra0@gmail.com">eyemantra0@gmail.com</option>
              <option value="support@mantracare.com">support@mantracare.com</option>
            </select>
          </div>
        </div>
      </Drawer>

      {/* ── COMPOSE SELECT FIELDS MODAL (EXACT SAME AS DOCUMENT TEMPLATE BUILDER) ── */}
      <DocumentSelectFieldsModal
        isOpen={isComposeVariableModalOpen}
        onClose={() => setIsComposeVariableModalOpen(false)}
        onInsert={handleInsertComposeVariable}
        title="Select Fields"
        subtitle="Insert placeholder variables into your email message"
        tokenFormat="double_curly"
      />
    </>
  );
}
