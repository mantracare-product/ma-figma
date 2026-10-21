import React, { useState } from "react";
import {
  Mail,
  Settings,
  Check,
  X,
  Shield,
  Layers,
  Calendar,
  User,
  Plus,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";

interface MailboxIntegrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MailboxIntegrationDrawer({
  isOpen,
  onClose,
}: MailboxIntegrationDrawerProps) {
  const [selectedMailboxProvider, setSelectedMailboxProvider] = useState<
    "gmail" | "outlook" | "exchange" | "yahoo" | "imap"
  >("gmail");
  const [mailboxIsAuthenticated, setMailboxIsAuthenticated] = useState(true);

  // Import emails
  const [mailboxImportEmails, setMailboxImportEmails] = useState(true);
  const [mailboxImportRange, setMailboxImportRange] = useState("week");

  // Outgoing parameters
  const [mailboxOutgoingSenderName, setMailboxOutgoingSenderName] = useState(false);
  const [mailboxSenderNameText, setMailboxSenderNameText] = useState("Mantra Care Care Team");
  const [mailboxDailyEmailLimit, setMailboxDailyEmailLimit] = useState(false);
  const [mailboxDailyLimitValue, setMailboxDailyLimitValue] = useState("500");

  // CRM integration
  const [mailboxLinkToCrm, setMailboxLinkToCrm] = useState(true);
  const [mailboxCrmImportEmails, setMailboxCrmImportEmails] = useState(true);
  const [mailboxCrmImportRange, setMailboxCrmImportRange] = useState("week");
  const [mailboxCrmRouteToManagers, setMailboxCrmRouteToManagers] = useState(true);
  const [mailboxCrmCreateIncomingEnabled, setMailboxCrmCreateIncomingEnabled] = useState(true);
  const [mailboxCrmCreateIncomingType, setMailboxCrmCreateIncomingType] = useState<"Lead" | "Contact" | "Deal">("Lead");
  const [mailboxCrmCreateOutgoingEnabled, setMailboxCrmCreateOutgoingEnabled] = useState(false);
  const [mailboxCrmCreateOutgoingType, setMailboxCrmCreateOutgoingType] = useState<"Contact" | "Lead">("Contact");
  const [mailboxCrmVcardContacts, setMailboxCrmVcardContacts] = useState(true);
  const [mailboxCrmLeadSource, setMailboxCrmLeadSource] = useState("E-Mail");
  const [mailboxCrmQueueUsers, setMailboxCrmQueueUsers] = useState<string[]>([
    "Sarah Jenkins",
    "Dr. Emily Chen",
    "Navodya Jain",
  ]);

  // Calendar integration
  const [mailboxAddToCalendar, setMailboxAddToCalendar] = useState(true);

  // Mailbox access permissions
  const [mailboxAccessUsers, setMailboxAccessUsers] = useState<string[]>([
    "Navodya Jain",
    "Clinical Support Desk",
  ]);

  const [showAddMemberModal, setShowAddMemberModal] = useState<"crm" | "access" | null>(null);

  const handleSave = () => {
    toast.success("Mailbox integration settings saved successfully");
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#1456f0] flex items-center justify-center font-bold text-sm shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Mailbox Integration &amp; Email Settings
            </h3>
            <p className="text-[11px] text-gray-500">
              Configure server connection, CRM activity synchronization, and team permissions
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-700 hover:bg-slate-50 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 text-xs text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Provider Selector Card */}
        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {selectedMailboxProvider === "gmail" ? (
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 48 48" className="w-8 h-8 shrink-0">
                  <path fill="#EA4335" d="M6 8v32h12V27.7L6 8z" />
                  <path fill="#34A853" d="M42 8v32H30V27.7L42 8z" />
                  <path fill="#4285F4" d="M6 8l18 12.3L42 8H6z" />
                  <path fill="#FBBC05" d="M18 27.7V40h12V27.7L24 31.7l-6-4z" />
                </svg>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Gmail / Google Workspace</span>
                  <span className="text-[11px] text-slate-500">Connected as navodya@mantra.care</span>
                </div>
              </div>
            ) : selectedMailboxProvider === "outlook" ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0078D4] flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">O</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Microsoft Outlook 365</span>
                  <span className="text-[11px] text-slate-500">Connected account</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 text-white">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">IMAP / SMTP Server</span>
                  <span className="text-[11px] text-slate-500">Standard protocol</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMailboxProvider}
              onChange={(e) => setSelectedMailboxProvider(e.target.value as any)}
              className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="exchange">Exchange</option>
              <option value="yahoo">Yahoo!</option>
              <option value="imap">IMAP / SMTP</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setMailboxIsAuthenticated((v) => !v);
                toast.success(mailboxIsAuthenticated ? "Account disconnected" : "Authenticated successfully");
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap ${
                mailboxIsAuthenticated
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {mailboxIsAuthenticated ? "Connected ✓" : "Authenticate"}
            </button>
          </div>
        </div>

        {/* Email import range */}
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mailboxImportEmails}
              onChange={(e) => setMailboxImportEmails(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-slate-700">
              Import emails received since{" "}
              <select
                value={mailboxImportRange}
                onChange={(e) => setMailboxImportRange(e.target.value)}
                className="underline decoration-dotted font-bold text-[#1456f0] bg-transparent border-none p-0 cursor-pointer focus:outline-none"
              >
                <option value="day">day</option>
                <option value="3 days">3 days</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="all time">all time</option>
              </select>{" "}
              up until today into your Mantra Care mailbox
            </span>
          </label>
        </div>

        {/* Outgoing email parameters */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            Outgoing Email Parameters
          </h4>
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mailboxOutgoingSenderName}
                onChange={(e) => setMailboxOutgoingSenderName(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-slate-700">Use custom sender name for every message instead of account name</span>
            </label>
            {mailboxOutgoingSenderName && (
              <div className="ml-6.5">
                <input
                  type="text"
                  value={mailboxSenderNameText}
                  onChange={(e) => setMailboxSenderNameText(e.target.value)}
                  placeholder="Default Sender Name"
                  className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mailboxDailyEmailLimit}
                onChange={(e) => setMailboxDailyEmailLimit(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-slate-700">Set daily email dispatch limit</span>
            </label>
            {mailboxDailyEmailLimit && (
              <div className="ml-6.5 flex items-center gap-2">
                <input
                  type="number"
                  value={mailboxDailyLimitValue}
                  onChange={(e) => setMailboxDailyLimitValue(e.target.value)}
                  className="w-24 px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-500">emails per 24 hours</span>
              </div>
            )}
          </div>
        </div>

        {/* CRM Integration Section */}
        <div className="pt-4 border-t border-gray-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              CRM Integration &amp; Activity Tracking
            </h4>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mailboxLinkToCrm}
                onChange={(e) => setMailboxLinkToCrm(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">Link to CRM</span>
            </label>
          </div>

          {mailboxLinkToCrm && (
            <div className="space-y-3 pl-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mailboxCrmImportEmails}
                  onChange={(e) => setMailboxCrmImportEmails(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-slate-700">
                  Import emails received since{" "}
                  <select
                    value={mailboxCrmImportRange}
                    onChange={(e) => setMailboxCrmImportRange(e.target.value)}
                    className="underline decoration-dotted font-bold text-[#1456f0] bg-transparent border-none p-0 cursor-pointer focus:outline-none"
                  >
                    <option value="day">day</option>
                    <option value="3 days">3 days</option>
                    <option value="week">week</option>
                    <option value="month">month</option>
                    <option value="all time">all time</option>
                  </select>{" "}
                  into the CRM, and convert each into an activity
                </span>
              </label>

              {/* Route emails */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mailboxCrmRouteToManagers}
                  onChange={(e) => setMailboxCrmRouteToManagers(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-slate-700">Route emails from existing clients to assigned CRM managers</span>
              </label>

              {/* Create incoming */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mailboxCrmCreateIncomingEnabled}
                    onChange={(e) => setMailboxCrmCreateIncomingEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700">
                    Create{" "}
                    <select
                      value={mailboxCrmCreateIncomingType}
                      onChange={(e) => setMailboxCrmCreateIncomingType(e.target.value as any)}
                      className="underline decoration-dotted font-bold text-[#1456f0] bg-transparent border-none p-0 cursor-pointer focus:outline-none"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Contact">Contact</option>
                      <option value="Deal">Deal</option>
                    </select>{" "}
                    for incoming messages from new email address
                  </span>
                </label>
              </div>

              {/* Lead and contact distribution queue */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-700 block">Lead and contact distribution queue:</span>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-gray-200 bg-slate-50 min-h-[40px]">
                  {mailboxCrmQueueUsers.map((user) => (
                    <span
                      key={user}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1456f0] text-xs font-semibold border border-blue-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#1456f0] text-white flex items-center justify-center text-[10px] font-bold">
                        {user.charAt(0)}
                      </span>
                      <span>{user}</span>
                      <button
                        type="button"
                        onClick={() => setMailboxCrmQueueUsers(mailboxCrmQueueUsers.filter((u) => u !== user))}
                        className="hover:text-red-600 text-gray-400 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt("Enter team member name to add to queue:");
                      if (name && name.trim()) {
                        setMailboxCrmQueueUsers((prev) => [...prev, name.trim()]);
                      }
                    }}
                    className="text-xs font-semibold text-[#1456f0] hover:underline px-1 py-0.5 cursor-pointer flex items-center gap-1"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Integration */}
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            Calendar Integration
          </h4>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mailboxAddToCalendar}
              onChange={(e) => setMailboxAddToCalendar(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-slate-700">Automatically sync consultation and appointment events to Calendar</span>
          </label>
        </div>

        {/* Mailbox Access Permissions */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            Mailbox Access Permissions
          </h4>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800 leading-relaxed">
            Grant employees permission to this shared mailbox so they can collaborate on patient replies.
          </div>

          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-gray-200 bg-slate-50 min-h-[40px]">
            {mailboxAccessUsers.map((user) => (
              <span
                key={user}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1456f0] text-xs font-semibold border border-blue-200"
              >
                <span className="w-4 h-4 rounded-full bg-[#1456f0] text-white flex items-center justify-center text-[10px] font-bold">
                  {user.charAt(0)}
                </span>
                <span>{user}</span>
                <button
                  type="button"
                  onClick={() => setMailboxAccessUsers(mailboxAccessUsers.filter((u) => u !== user))}
                  className="hover:text-red-600 text-gray-400 ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Enter team member name to grant access:");
                if (name && name.trim()) {
                  setMailboxAccessUsers((prev) => [...prev, name.trim()]);
                }
              }}
              className="text-xs font-semibold text-[#1456f0] hover:underline px-1 py-0.5 cursor-pointer flex items-center gap-1"
            >
              + Add
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
