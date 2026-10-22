import React, { useState } from "react";
import {
  Mail,
  Check,
  Eye,
  EyeOff,
  Info,
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
    "gmail" | "outlook" | "imap"
  >("gmail");
  const [mailboxIsAuthenticated, setMailboxIsAuthenticated] = useState(true);

  // Outlook fields
  const [outlookUserPrincipalName, setOutlookUserPrincipalName] = useState("");

  // IMAP fields
  const [imapEmailAddress, setImapEmailAddress] = useState("info@example.com");
  const [imapServer, setImapServer] = useState("imap.example.com");
  const [imapPort, setImapPort] = useState("993");
  const [imapSecureConnection, setImapSecureConnection] = useState(true);
  const [imapLogin, setImapLogin] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [imapShowPassword, setImapShowPassword] = useState(false);
  const [imapDeliverEmails, setImapDeliverEmails] = useState(true);
  const [imapDeliverRange, setImapDeliverRange] = useState("1 week");

  // SMTP fields
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const [smtpSameSenderName, setSmtpSameSenderName] = useState(false);
  const [smtpMaxOutgoingMessages, setSmtpMaxOutgoingMessages] = useState(false);
  const [smtpServer, setSmtpServer] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecureConnection, setSmtpSecureConnection] = useState(true);
  const [smtpLogin, setSmtpLogin] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpShowPassword, setSmtpShowPassword] = useState(false);
  const [smtpSaveSentOnServer, setSmtpSaveSentOnServer] = useState(false);

  // Email Integration & CRM Settings Checkboxes
  const [syncEmailsWithCrm, setSyncEmailsWithCrm] = useState(true);
  const [syncEmailsWithCrmRange, setSyncEmailsWithCrmRange] = useState("1 week");
  const [assignEmailsToResponsible, setAssignEmailsToResponsible] = useState(true);
  const [createContactsUsingVCard, setCreateContactsUsingVCard] = useState(true);
  const [createOnIncomingEmail, setCreateOnIncomingEmail] = useState(true);
  const [incomingCreateType, setIncomingCreateType] = useState<"Lead" | "Contact" | "Deal">("Lead");
  const [createOnOutgoingEmail, setCreateOnOutgoingEmail] = useState(true);
  const [outgoingCreateType, setOutgoingCreateType] = useState<"Contact" | "Lead">("Contact");

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
              Configure server connection and email synchronization
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
        {/* Provider Selector Bar */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Provider:</span>
            <select
              value={selectedMailboxProvider}
              onChange={(e) => setSelectedMailboxProvider(e.target.value as any)}
              className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 cursor-pointer shadow-2xs"
            >
              <option value="gmail">Gmail / Google Workspace</option>
              <option value="outlook">Microsoft Outlook 365</option>
              <option value="imap">Other (IMAP / SMTP)</option>
            </select>
          </div>

          {selectedMailboxProvider === "gmail" && (
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
          )}
        </div>

        {/* 1. Gmail Provider Card */}
        {selectedMailboxProvider === "gmail" && (
          <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
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
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
        )}

        {/* 2. Outlook Integration (Screenshot 1) */}
        {selectedMailboxProvider === "outlook" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <div className="w-6 h-6 rounded-md bg-[#2B78D4] text-white flex items-center justify-center shadow-2xs">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span>Email service</span>
            </div>

            <div className="p-4 rounded-xl border border-[#CCE4F7] bg-[#F4F9FD] shadow-2xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0078D4] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="font-bold text-xs text-slate-900">Webmail client: Outlook</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMailboxIsAuthenticated(!mailboxIsAuthenticated);
                  toast.success(mailboxIsAuthenticated ? "Outlook disconnected" : "Connected via OAuth successfully");
                }}
                className="text-xs font-semibold text-[#1456f0] hover:underline transition-colors cursor-pointer"
              >
                {mailboxIsAuthenticated ? "Connected via OAuth ✓" : "Connect via OAuth"}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">User Principal Name</label>
              <input
                type="text"
                value={outlookUserPrincipalName}
                onChange={(e) => setOutlookUserPrincipalName(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
              <p className="text-[11px] text-gray-500">
                Use if your mailbox has different SMTP credentials (example: Exchange or Office365)
              </p>
            </div>
          </div>
        )}

        {/* 3. IMAP & SMTP Settings (Screenshot 2) */}
        {selectedMailboxProvider === "imap" && (
          <div className="space-y-5">
            {/* Card 1: Email service */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="w-6 h-6 rounded-md bg-[#2B78D4] text-white flex items-center justify-center shadow-2xs">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span>Email service</span>
              </div>

              <div className="p-3 rounded-xl border border-[#D0E7FA] bg-[#F4F9FD] flex items-center gap-2.5 text-slate-800 text-xs font-semibold">
                <Mail className="w-4 h-4 text-[#2B78D4]" />
                <span>Account email</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Email address</label>
                <input
                  type="email"
                  value={imapEmailAddress}
                  onChange={(e) => setImapEmailAddress(e.target.value)}
                  placeholder="info@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-600">IMAP</label>
                  <input
                    type="text"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                    placeholder="imap.example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Port</label>
                  <input
                    type="text"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={imapSecureConnection}
                    onChange={(e) => setImapSecureConnection(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700">Use secure connection</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Login</label>
                <input
                  type="text"
                  value={imapLogin}
                  onChange={(e) => setImapLogin(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={imapShowPassword ? "text" : "password"}
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setImapShowPassword(!imapShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600"
                  >
                    {imapShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={imapDeliverEmails}
                    onChange={(e) => setImapDeliverEmails(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700">
                    Deliver emails for{" "}
                    <span className="inline-flex items-center text-[#1456f0] underline decoration-dotted font-medium cursor-pointer relative">
                      <select
                        value={imapDeliverRange}
                        onChange={(e) => setImapDeliverRange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full text-slate-800 bg-white"
                      >
                        <option value="3 days">3 days</option>
                        <option value="1 week">1 week</option>
                        <option value="2 weeks">2 weeks</option>
                        <option value="1 month">1 month</option>
                        <option value="all time">all time</option>
                      </select>
                      <span>{imapDeliverRange}</span>
                      <svg className="w-3.5 h-3.5 ml-1 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </span>
                </label>
                <div className="pl-6">
                  <span className="text-xs text-[#1456f0] underline decoration-dotted font-medium hover:opacity-80 cursor-pointer">
                    More parameters
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: SMTP settings */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-md bg-[#2B78D4] text-white flex items-center justify-center shadow-2xs">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span>SMTP settings</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSmtpEnabled(!smtpEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    smtpEnabled ? "bg-[#0078D4]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      smtpEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {smtpEnabled && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smtpSameSenderName}
                        onChange={(e) => setSmtpSameSenderName(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700">Use the same sender name for all messages</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smtpMaxOutgoingMessages}
                        onChange={(e) => setSmtpMaxOutgoingMessages(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700">Maximum number of outgoing messages</span>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900 leading-relaxed">
                    Make sure the SMTP server parameters you specified are correct.
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600">SMTP Server</label>
                      <input
                        type="text"
                        value={smtpServer}
                        onChange={(e) => setSmtpServer(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Port</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smtpSecureConnection}
                        onChange={(e) => setSmtpSecureConnection(e.target.checked)}
                        className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700">Use secure connection</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Login</label>
                    <input
                      type="text"
                      value={smtpLogin}
                      onChange={(e) => setSmtpLogin(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Password</label>
                    <div className="relative">
                      <input
                        type={smtpShowPassword ? "text" : "password"}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSmtpShowPassword(!smtpShowPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600"
                      >
                        {smtpShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smtpSaveSentOnServer}
                        onChange={(e) => setSmtpSaveSentOnServer(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 flex items-center gap-1.5">
                        Save a copy of sent emails on server
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email & CRM Integration Checkboxes */}
        <div className="pt-2 space-y-4">
          {/* 1. Sync emails with CRM */}
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncEmailsWithCrm}
                onChange={(e) => setSyncEmailsWithCrm(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">
                  Sync emails with CRM for:{" "}
                  <span className="inline-flex items-center text-[#1456f0] underline decoration-dotted font-medium cursor-pointer relative">
                    <select
                      value={syncEmailsWithCrmRange}
                      onChange={(e) => setSyncEmailsWithCrmRange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full text-slate-800 bg-white"
                    >
                      <option value="3 days">3 days</option>
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="all time">all time</option>
                    </select>
                    <span>{syncEmailsWithCrmRange}</span>
                    <svg className="w-3.5 h-3.5 ml-1 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  Emails received within the selected time period will be added to the CRM and made available to everyone with sufficient permissions.
                </p>
              </div>
            </label>
          </div>

          {/* 2. Assign emails from known contacts */}
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={assignEmailsToResponsible}
                onChange={(e) => setAssignEmailsToResponsible(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
              />
              <span className="text-xs font-medium text-slate-800">
                Assign emails from known contacts to assigned responsible persons
              </span>
            </label>
          </div>

          {/* 3. Create contacts using attached vCard */}
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createContactsUsingVCard}
                onChange={(e) => setCreateContactsUsingVCard(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
              />
              <span className="text-xs font-medium text-slate-800">
                Create contacts using attached vCard
              </span>
            </label>
          </div>

          {/* 4. When a first email is received from a new address */}
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createOnIncomingEmail}
                onChange={(e) => setCreateOnIncomingEmail(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">
                  When a first email is received from a new address, create:{" "}
                  <span className="inline-flex items-center text-[#1456f0] underline decoration-dotted font-medium cursor-pointer relative">
                    <select
                      value={incomingCreateType}
                      onChange={(e) => setIncomingCreateType(e.target.value as any)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full text-slate-800 bg-white"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Contact">Contact</option>
                      <option value="Deal">Deal</option>
                    </select>
                    <span>{incomingCreateType}</span>
                    <svg className="w-3.5 h-3.5 ml-1 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  CRM items created from emails will be made available to everyone with sufficient permissions.
                </p>
              </div>
            </label>
          </div>

          {/* 5. When a first email is sent to a new address */}
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createOnOutgoingEmail}
                onChange={(e) => setCreateOnOutgoingEmail(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 border-gray-300 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">
                  When a first email is sent to a new address, create:{" "}
                  <span className="inline-flex items-center text-[#1456f0] underline decoration-dotted font-medium cursor-pointer relative">
                    <select
                      value={outgoingCreateType}
                      onChange={(e) => setOutgoingCreateType(e.target.value as any)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full text-slate-800 bg-white"
                    >
                      <option value="Contact">Contact</option>
                      <option value="Lead">Lead</option>
                    </select>
                    <span>{outgoingCreateType}</span>
                    <svg className="w-3.5 h-3.5 ml-1 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  CRM items created from emails will be made available to everyone with sufficient permissions.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
