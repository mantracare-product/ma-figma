// ShareTaskDrawer.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Copy,
  Link2,
  MessageSquare,
  Mail,
  MessageCircle,
  Smartphone,
  CheckSquare,
  Calendar,
  User,
  Share2,
  Check,
  Search,
  CheckCircle2,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { toast } from "sonner";
import { TaskEntity } from "../../../types/task";
import {
  ShareChannel,
  ShareClient,
  ShareLiteralRecipient,
} from "../webform/shareTypes";
import ShareRecipientPicker from "../webform/ShareRecipientPicker";
import { initialClients, Client } from "../../../data/canonicalClients";
import { addNotification } from "../../../lib/notificationsStore";
import { TEST_CHAT_SYNC_EVENT } from "../../../lib/testConversationSync";

export interface ShareTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskEntity | null;
  onSend?: (payload: {
    taskId: string;
    channel: ShareChannel;
    clients: ShareClient[];
    literals: ShareLiteralRecipient[];
    message: string;
  }) => void;
}

const CONNECTED_ACCOUNTS: Record<ShareChannel, Array<{ value: string; label: string }>> = {
  sms: [
    { value: "+15551234567", label: "+1 (555) 123-4567 (Mantra Clinic SMS)" },
    { value: "+15559876543", label: "+1 (555) 987-6543 (Direct Alerts)" },
  ],
  whatsapp: [
    { value: "+15551234567", label: "+1 (555) 123-4567 (Mantra Official WhatsApp)" },
  ],
  email: [
    { value: "notifications@mantra.care", label: "notifications@mantra.care" },
    { value: "support@mantra.care", label: "support@mantra.care" },
  ],
  patient_app: [],
};

// Dispatch task assignment message into the client's portal chat
export function sendTaskToPortalChat(
  clientId: string,
  clientName: string,
  task: TaskEntity,
  customMessage?: string
) {
  const taskUrl = `${window.location.origin}/patient/tasks`;
  const text =
    customMessage ||
    `📋 Task Assigned: ${task.title}\nStage: ${task.stageName || "Task Created"}\nDeadline: ${task.deadline || "None"}\nLink: ${taskUrl}`;

  try {
    const raw = localStorage.getItem("whatsappMockConversations");
    let convs: any[] = raw ? JSON.parse(raw) : [];

    // Find conversation matching this client
    let conv = convs.find(
      (c: any) =>
        c.clientId === clientId ||
        c.contactName === clientName ||
        c.id === `doc-${clientId}` ||
        c.id === clientId
    );

    const newMsg = {
      id: `msg-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }),
      sender: "me",
      senderName: "Care Team",
      status: "delivered",
      origin: "human",
    };

    if (conv) {
      conv.messages = [...(conv.messages || []), newMsg];
      conv.lastMessage = text;
      conv.timestamp = "Just now";
    } else {
      conv = {
        id: `doc-${clientId}`,
        clientId,
        contactName: clientName,
        phoneNumber: "+1 (555) 234-5678",
        channel: "whatsapp",
        lastMessage: text,
        timestamp: "Just now",
        unreadCount: 1,
        messages: [newMsg],
      };
      convs.unshift(conv);
    }

    localStorage.setItem("whatsappMockConversations", JSON.stringify(convs));
    window.dispatchEvent(new Event(TEST_CHAT_SYNC_EVENT));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to sync task message to portal chat:", err);
  }
}

export default function ShareTaskDrawer({
  isOpen,
  onClose,
  task,
  onSend,
}: ShareTaskDrawerProps) {
  const [channel, setChannel] = useState<ShareChannel>("sms");
  const [selectedClients, setSelectedClients] = useState<ShareClient[]>([]);
  const [selectedLiterals, setSelectedLiterals] = useState<ShareLiteralRecipient[]>([]);
  const [connectedAccount, setConnectedAccount] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Portal clients state
  const [portalClientSearch, setPortalClientSearch] = useState("");
  const [selectedPortalClientIds, setSelectedPortalClientIds] = useState<string[]>(["CL-001"]);

  const taskUrl = task
    ? `${window.location.origin}/tasks?id=${task.id}`
    : window.location.href;

  const defaultTaskSummary = task
    ? `Task [${task.code}]: ${task.title}\nStage: ${task.stageName || "Task Created"}\nDeadline: ${task.deadline || "None"}\nLink: ${taskUrl}`
    : "";

  const [message, setMessage] = useState(defaultTaskSummary);
  const [emailSubject, setEmailSubject] = useState("");

  useEffect(() => {
    if (task) {
      const summary = `Task [${task.code}]: ${task.title}\nStage: ${task.stageName || "Task Created"}\nDeadline: ${task.deadline || "None"}\nLink: ${taskUrl}`;
      setMessage(summary);
      setEmailSubject(`Task Assignment & Brief: [${task.code}] ${task.title}`);
      setSelectedClients([]);
      setSelectedLiterals([]);
      setConnectedAccount(CONNECTED_ACCOUNTS[channel][0]?.value || "");

      // If task assignee is a contact, select that client by default
      if (task.assignee.clientId) {
        setSelectedPortalClientIds([task.assignee.clientId]);
      } else {
        setSelectedPortalClientIds(["CL-001"]);
      }
    }
  }, [task, channel, taskUrl]);

  if (!task) return null;

  // Filter portal available clients
  const portalClients = initialClients.filter((c) => {
    if (!portalClientSearch) return true;
    const q = portalClientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(taskUrl);
    setCopiedLink(true);
    toast.success("Task link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrimaryAction = () => {
    if (channel === "patient_app") {
      if (selectedPortalClientIds.length === 0) {
        toast.error("Please select at least one client on the portal");
        return;
      }

      // Send to each client's chat and record notification
      const selectedClientObjects = initialClients.filter((c) =>
        selectedPortalClientIds.includes(c.id)
      );

      selectedClientObjects.forEach((client) => {
        sendTaskToPortalChat(client.id, client.name, task, message);

        addNotification({
          type: "task",
          title: "Task Sent to Portal Chat",
          message: `Task ${task.code} was posted to ${client.name}'s care chat channel.`,
          link: `/tasks?id=${task.id}`,
          meta: { taskId: task.id, clientId: client.id },
        });
      });

      const clientNames = selectedClientObjects.map((c) => c.name).join(", ");
      toast.success(`Task shared and posted in chat for ${clientNames}`);
      onClose();
      return;
    }

    const totalSelected = selectedClients.length + selectedLiterals.length;
    if (totalSelected === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    onSend?.({
      taskId: task.id,
      channel,
      clients: selectedClients,
      literals: selectedLiterals,
      message,
    });

    const channelName =
      channel === "sms"
        ? "SMS"
        : channel === "whatsapp"
        ? "WhatsApp"
        : "Email";

    toast.success(`Task shared via ${channelName} successfully`);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Share Task"
      subtitle={`${task.code} · ${task.title}`}
      icon={<Share2 className="w-5 h-5 text-slate-700" />}
      width="max-w-[560px]"
      zIndex={660}
      bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
    >
      {/* ── Direct Link Card ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Link2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Task Direct Link</span>
          <InfoTooltip content="Shareable browser link directly opening this task detail drawer" />
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={taskUrl}
            className="flex-1 text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* ── Channel Selector Tabs ── */}
      <div className="space-y-1.5">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span>Delivery Channel</span>
          <InfoTooltip content="Choose how to dispatch this task notification to team members or contacts" />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { id: "sms", label: "SMS", icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-3.5 h-3.5" /> },
              { id: "email", label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
              { id: "patient_app", label: "Client Portal", icon: <Smartphone className="w-3.5 h-3.5" /> },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChannel(c.id);
                setConnectedAccount(CONNECTED_ACCOUNTS[c.id]?.[0]?.value || "");
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                channel === c.id
                  ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
              }`}
            >
              {c.icon}
              <span className="text-[11px] font-medium">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Channel Account Picker (SMS / WhatsApp / Email) ── */}
      {channel !== "patient_app" && CONNECTED_ACCOUNTS[channel]?.length > 0 && (
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Sender Account</span>
            <InfoTooltip content="Outbound sender identity / phone number for this transmission" />
          </label>
          <select
            value={connectedAccount}
            onChange={(e) => setConnectedAccount(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 font-semibold cursor-pointer"
          >
            {CONNECTED_ACCOUNTS[channel].map((acc) => (
              <option key={acc.value} value={acc.value}>
                {acc.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Client Portal Channel: Pick Clients Available on Portal & Send to Chat ── */}
      {channel === "patient_app" ? (
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              <span>Clients Available on Portal</span>
              <InfoTooltip content="Select which portal-registered clients will receive this task in their companion app and chat messages" />
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              {selectedPortalClientIds.length} selected
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search portal clients by name or email..."
              value={portalClientSearch}
              onChange={(e) => setPortalClientSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Client List */}
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white">
            {portalClients.slice(0, 10).map((client) => {
              const isSelected = selectedPortalClientIds.includes(client.id);
              return (
                <div
                  key={client.id}
                  onClick={() => {
                    setSelectedPortalClientIds((prev) =>
                      isSelected ? prev.filter((id) => id !== client.id) : [...prev, client.id]
                    );
                  }}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by row click
                      className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{client.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{client.email || client.phone}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Portal Active
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            💬 <strong>Live Chat Integration:</strong> Sharing this task will post the briefing directly into the client's care chat in their Companion App.
          </p>
        </div>
      ) : (
        /* Recipient Picker for SMS / WhatsApp / Email */
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Recipients</span>
            <InfoTooltip content="Select contacts or enter phone/email addresses directly" />
          </label>
          <ShareRecipientPicker
            channel={channel}
            selectedClients={selectedClients}
            selectedLiterals={selectedLiterals}
            onClientsChange={setSelectedClients}
            onLiteralsChange={setSelectedLiterals}
          />
        </div>
      )}

      {/* ── Message Composer ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        {channel === "email" && (
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Subject Line</span>
              <InfoTooltip content="Email subject headline displayed in recipient inbox" />
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 focus:bg-white"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>{channel === "email" ? "Email Message Body" : "Message Body"}</span>
            <InfoTooltip content="Content sent to recipient with task brief" />
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 focus:bg-white resize-none font-sans"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{message.length} characters</span>
            {channel === "sms" && (
              <span>~{Math.ceil(message.length / 160) || 1} SMS segment(s)</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar (Removed from Header, Now Placed at Bottom) ── */}
      <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="px-5 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {channel === "patient_app"
            ? "Publish to Client Portal & Chat"
            : `Send via ${channel === "sms" ? "SMS" : channel === "whatsapp" ? "WhatsApp" : "Email"}`}
        </button>
      </div>
    </DrawerShell>
  );
}
