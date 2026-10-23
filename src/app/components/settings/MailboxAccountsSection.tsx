import React, { useState } from "react";
import { Mail, Plus, Trash2, X, Check } from "lucide-react";
import { useMailboxAccounts, MailboxAccount } from "../../../lib/mailboxStore";
import { toast } from "sonner";

interface MailboxAccountsSectionProps {
  initialProvider?: "gmail" | "outlook" | "imap" | null;
}

export default function MailboxAccountsSection({
  initialProvider,
}: MailboxAccountsSectionProps) {
  const {
    accounts,
    addAccount,
    removeAccount,
    setDefaultAccount,
    toggleAccountStatus,
  } = useMailboxAccounts();

  const [showAddForm, setShowAddForm] = useState(false);

  // New account form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newServer, setNewServer] = useState("");
  const [newPort, setNewPort] = useState("993");
  const [newSecure, setNewSecure] = useState(true);

  // Filter accounts strictly by the current provider if provided
  const displayedAccounts = accounts.filter((acc) => {
    if (!initialProvider) return true;
    return acc.provider === initialProvider;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    const providerToUse = initialProvider || "gmail";

    const created = addAccount({
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || (providerToUse === "gmail" ? "Gmail" : providerToUse === "outlook" ? "Outlook" : "Mailbox"),
      provider: providerToUse,
      status: "connected",
      isDefault: displayedAccounts.length === 0,
      server: providerToUse === "imap" ? newServer || "imap.example.com" : undefined,
      port: providerToUse === "imap" ? newPort : undefined,
      secure: providerToUse === "imap" ? newSecure : undefined,
    });

    toast.success(`Connected account ${created.email}`);
    setNewEmail("");
    setNewName("");
    setNewServer("");
    setShowAddForm(false);
  };

  const renderProviderIcon = (provider: MailboxAccount["provider"]) => {
    if (provider === "gmail") {
      return (
        <svg viewBox="0 0 48 48" className="w-8 h-8 shrink-0">
          <path fill="#EA4335" d="M6 8v32h12V27.7L6 8z" />
          <path fill="#34A853" d="M42 8v32H30V27.7L42 8z" />
          <path fill="#4285F4" d="M6 8l18 12.3L42 8H6z" />
          <path fill="#FBBC05" d="M18 27.7V40h12V27.7L24 31.7l-6-4z" />
        </svg>
      );
    }
    if (provider === "outlook") {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#0078D4] flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-white font-bold text-sm">O</span>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#2B78D4] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Mail className="w-4 h-4" />
      </div>
    );
  };

  const providerLabel = initialProvider === "gmail"
    ? "Gmail"
    : initialProvider === "outlook"
    ? "Outlook"
    : initialProvider === "imap"
    ? "Mailbox"
    : "Mailbox";

  return (
    <div className="space-y-3">
      {/* Connected Accounts List */}
      <div className="space-y-2.5">
        {displayedAccounts.map((account) => {
          const isConnected = account.status === "connected";

          return (
            <div
              key={account.id}
              className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-border transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Provider Logo, Name, Email */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {renderProviderIcon(account.provider)}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {account.name || providerLabel}
                      </span>
                      {account.isDefault && displayedAccounts.length > 1 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-[#2FC6F6] border border-sky-200 dark:border-sky-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {account.email}
                    </p>
                  </div>
                </div>

                {/* Right: Authentication Button and Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      toggleAccountStatus(account.id);
                      toast.success(
                        isConnected
                          ? `Disconnected ${account.email}`
                          : `Authenticated ${account.email} successfully`
                      );
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded tracking-wider uppercase transition-colors shadow-2xs whitespace-nowrap cursor-pointer ${
                      isConnected
                        ? "bg-[#2FC6F6] hover:bg-[#20B5E4] text-white"
                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                    }`}
                  >
                    {isConnected ? "AUTHENTICATION" : "AUTHENTICATE"}
                  </button>

                  {/* Remove Button if multiple accounts exist */}
                  {displayedAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove account ${account.email}?`)) {
                          removeAccount(account.id);
                          toast.success(`Removed account ${account.email}`);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded transition-colors cursor-pointer"
                      title="Remove Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {displayedAccounts.length === 0 && !showAddForm && (
          <div className="p-6 text-center border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground">
              No {providerLabel} accounts connected yet.
            </p>
          </div>
        )}
      </div>

      {/* Add New Mailbox Form (Inline) */}
      {showAddForm ? (
        <form
          onSubmit={handleAddSubmit}
          className="p-4 rounded-xl border border-[#2FC6F6]/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Add {providerLabel} Account
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={initialProvider === "gmail" ? "user@mantracare.com" : "user@example.com"}
                className="w-full text-xs px-2.5 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2FC6F6] text-foreground"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Account Name / Alias (Optional)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Support Desk, Dr. Smith"
                className="w-full text-xs px-2.5 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2FC6F6] text-foreground"
              />
            </div>

            {initialProvider === "imap" && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    IMAP Host
                  </label>
                  <input
                    type="text"
                    value={newServer}
                    onChange={(e) => setNewServer(e.target.value)}
                    placeholder="imap.mailserver.com"
                    className="w-full text-xs px-2.5 py-1.5 bg-background border border-input rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-background border border-input rounded-lg text-foreground"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2FC6F6] hover:bg-[#20B5E4] text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wider cursor-pointer shadow-2xs"
            >
              Save &amp; Connect
            </button>
          </div>
        </form>
      ) : (
        /* Add Account Button */
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 px-3 border border-dashed border-[#2FC6F6]/60 hover:border-[#2FC6F6] hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-[#0284C7] dark:text-[#2FC6F6] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      )}
    </div>
  );
}
