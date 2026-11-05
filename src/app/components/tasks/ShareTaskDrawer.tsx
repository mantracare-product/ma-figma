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

  const taskUrl = task
    ? `${window.location.origin}/tasks?id=${task.id}`
    : window.location.href;

  const defaultTaskSummary = task
    ? `Task [${task.code}]: ${task.title}\nStage: ${task.stageName || "Task Created"}\nDeadline: ${task.deadline || "None"}\nDetails: ${taskUrl}`
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
    }
  }, [task, channel, taskUrl]);

  if (!task) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(taskUrl);
    setCopiedLink(true);
    toast.success("Task link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrimaryAction = () => {
    const totalSelected = selectedClients.length + selectedLiterals.length;
    if (channel !== "patient_app" && totalSelected === 0) {
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
        : channel === "email"
        ? "Email"
        : "Patient App";

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
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {channel === "patient_app"
              ? "Publish to Portal"
              : `Send via ${channel === "sms" ? "SMS" : channel === "whatsapp" ? "WhatsApp" : "Email"}`}
          </button>
        </div>
      }
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
                setConnectedAccount(CONNECTED_ACCOUNTS[c.id][0]?.value || "");
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

      {/* ── Channel Account Picker ── */}
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

      {/* ── Recipient Picker (Modeled on ShareRecipientPicker) ── */}
      {channel !== "patient_app" ? (
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
      ) : (
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Companion App & Client Portal Integration</span>
            <InfoTooltip content="Publishes this task to the client's companion app under active care tasks" />
          </label>
          <p className="text-xs text-slate-600 leading-relaxed">
            Publishing this task to the companion portal will make it visible to{" "}
            <strong>{task.assignee.assigneeName}</strong> with checklist progress and status synchronization.
          </p>
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
    </DrawerShell>
  );
}
