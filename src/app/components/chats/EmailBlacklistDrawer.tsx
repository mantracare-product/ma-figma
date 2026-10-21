import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  AlertOctagon,
  Search,
  Check,
  X,
  Mail,
  Ban,
} from "lucide-react";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";

export interface BlacklistEntry {
  id: string;
  pattern: string; // email or @domain.com
  reason: "Spam" | "Unsolicited Outreach" | "Phishing / Security" | "Competitor" | "Other";
  addedAt: string;
  blockedCount?: number;
}

const DEFAULT_BLACKLIST: BlacklistEntry[] = [
  {
    id: "bl-1",
    pattern: "spam-marketing@massblast.org",
    reason: "Spam",
    addedAt: "Oct 18, 2026",
    blockedCount: 14,
  },
  {
    id: "bl-2",
    pattern: "*@unsolicitedleads.xyz",
    reason: "Unsolicited Outreach",
    addedAt: "Oct 12, 2026",
    blockedCount: 38,
  },
  {
    id: "bl-3",
    pattern: "alert-security@phish-login-attempt.net",
    reason: "Phishing / Security",
    addedAt: "Oct 05, 2026",
    blockedCount: 6,
  },
];

interface EmailBlacklistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailBlacklistDrawer({
  isOpen,
  onClose,
}: EmailBlacklistDrawerProps) {
  const [entries, setEntries] = useState<BlacklistEntry[]>(() => {
    try {
      const stored = localStorage.getItem("emailBlacklistEntries");
      return stored ? JSON.parse(stored) : DEFAULT_BLACKLIST;
    } catch {
      return DEFAULT_BLACKLIST;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [patternInput, setPatternInput] = useState("");
  const [reasonInput, setReasonInput] = useState<BlacklistEntry["reason"]>("Spam");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("emailBlacklistEntries", JSON.stringify(entries));
    } catch {}
  }, [entries]);

  const handleAddEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPattern = patternInput.trim().toLowerCase();
    if (!cleanPattern) {
      toast.error("Please enter an email address or @domain to block");
      return;
    }
    if (entries.some((entry) => entry.pattern.toLowerCase() === cleanPattern)) {
      toast.error(`"${cleanPattern}" is already in the blacklist`);
      return;
    }

    const newEntry: BlacklistEntry = {
      id: `bl-${Date.now()}`,
      pattern: cleanPattern,
      reason: reasonInput,
      addedAt: "Just now",
      blockedCount: 0,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setPatternInput("");
    setIsAdding(false);
    toast.success(`Added "${cleanPattern}" to blacklist`);
  };

  const handleRemoveEntry = (id: string, pattern: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success(`Removed "${pattern}" from blacklist`);
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return e.pattern.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q);
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100/70 text-red-600 flex items-center justify-center font-bold text-sm shadow-2xs">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Email Blacklist & Blocked Senders
            </h3>
            <p className="text-[11px] text-gray-500">
              Blocked addresses and domains are automatically discarded and will not create CRM activities
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-500">
            Total blocked: <strong>{entries.length}</strong> rules
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-5" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Top Info Banner */}
        <div className="p-3 bg-red-50/60 border border-red-200/60 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-bold">Active Shield Protection</p>
            <p className="text-red-600/90">
              Emails from blacklisted addresses or wildcard domains (e.g. <code>*@spam.com</code>) are rejected immediately.
            </p>
          </div>
        </div>

        {/* Action Header: Search & Add Toggle */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search blacklisted email or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 bg-white shadow-2xs font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAdding ? "Cancel" : "Add to Blacklist"}</span>
          </button>
        </div>

        {/* Add Entry Card Form */}
        {isAdding && (
          <form
            onSubmit={handleAddEntry}
            className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-3 animate-in fade-in zoom-in-95 duration-100"
          >
            <h4 className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Add Address or Domain to Blacklist
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Email or Domain</label>
                <input
                  type="text"
                  placeholder="e.g. badsender@domain.com or *@badspam.org"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Reason</label>
                <select
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white cursor-pointer"
                >
                  <option value="Spam">Spam</option>
                  <option value="Unsolicited Outreach">Unsolicited Outreach</option>
                  <option value="Phishing / Security">Phishing / Security</option>
                  <option value="Competitor">Competitor</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Block Address
              </button>
            </div>
          </form>
        )}

        {/* Blacklisted Entries List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
            <span>Blocked Rule & Reason</span>
            <span>Actions</span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 text-xs text-gray-400">
              No blacklisted addresses found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 font-mono truncate">{entry.pattern}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="font-semibold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                          {entry.reason}
                        </span>
                        <span>• Added {entry.addedAt}</span>
                        {entry.blockedCount !== undefined && entry.blockedCount > 0 && (
                          <span>• {entry.blockedCount} blocked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entry.id, entry.pattern)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer shrink-0"
                    title="Unblock this address"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
