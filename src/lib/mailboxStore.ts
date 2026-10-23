import { useState, useEffect } from "react";

export interface MailboxAccount {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "outlook" | "imap";
  status: "connected" | "disconnected" | "syncing" | "error";
  isDefault: boolean;
  connectedAt?: string;
  lastSyncedAt?: string;
  unreadCount?: number;
  // Specific config
  server?: string;
  port?: string;
  secure?: boolean;
}

export const MAILBOX_STORE_EVENT = "mantra_mailbox_accounts_updated";
export const MAILBOX_STORAGE_KEY = "mantra_mailbox_accounts";

export const INITIAL_MAILBOX_ACCOUNTS: MailboxAccount[] = [
  {
    id: "acc-1",
    email: "support@mantracare.com",
    name: "Mantra Care Support",
    provider: "gmail",
    status: "connected",
    isDefault: true,
    connectedAt: "2026-06-15",
    lastSyncedAt: "Just now",
    unreadCount: 7,
  },
  {
    id: "acc-2",
    email: "navodya@mantra.care",
    name: "Navodya Jain (Product Ops)",
    provider: "gmail",
    status: "connected",
    isDefault: false,
    connectedAt: "2026-07-01",
    lastSyncedAt: "5m ago",
    unreadCount: 3,
  },
  {
    id: "acc-3",
    email: "billing@mantracare.com",
    name: "Billing & Accounts",
    provider: "outlook",
    status: "connected",
    isDefault: false,
    connectedAt: "2026-08-10",
    lastSyncedAt: "15m ago",
    unreadCount: 1,
  },
  {
    id: "acc-4",
    email: "clinical@mantrahealth.io",
    name: "Clinical Desk & Referrals",
    provider: "imap",
    status: "connected",
    isDefault: false,
    connectedAt: "2026-09-05",
    lastSyncedAt: "1h ago",
    server: "mail.mantrahealth.io",
    port: "993",
    secure: true,
    unreadCount: 0,
  },
];

export function getStoredMailboxAccounts(): MailboxAccount[] {
  if (typeof window === "undefined") return INITIAL_MAILBOX_ACCOUNTS;
  try {
    const raw = localStorage.getItem(MAILBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_MAILBOX_ACCOUNTS;
}

export function saveStoredMailboxAccounts(accounts: MailboxAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event(MAILBOX_STORE_EVENT));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

export function useMailboxAccounts() {
  const [accounts, setAccountsState] = useState<MailboxAccount[]>(getStoredMailboxAccounts);

  useEffect(() => {
    const refresh = () => {
      setAccountsState(getStoredMailboxAccounts());
    };
    window.addEventListener(MAILBOX_STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MAILBOX_STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setAccounts = (updater: MailboxAccount[] | ((prev: MailboxAccount[]) => MailboxAccount[])) => {
    setAccountsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveStoredMailboxAccounts(next);
      return next;
    });
  };

  const addAccount = (newAcc: Omit<MailboxAccount, "id">) => {
    const acc: MailboxAccount = {
      ...newAcc,
      id: `acc-${Date.now()}`,
      connectedAt: new Date().toISOString().split("T")[0],
      lastSyncedAt: "Just now",
    };
    setAccounts((prev) => [...prev, acc]);
    return acc;
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
  };

  const setDefaultAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  };

  const toggleAccountStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "connected" ? "disconnected" : "connected",
            }
          : a
      )
    );
  };

  return {
    accounts,
    setAccounts,
    addAccount,
    removeAccount,
    setDefaultAccount,
    toggleAccountStatus,
  };
}
