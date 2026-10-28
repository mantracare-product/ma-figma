import React from "react";
import { Mail, Check } from "lucide-react";
import { Drawer } from "../ui/drawer";
import MailboxAccountsSection from "../settings/MailboxAccountsSection";

interface MailboxIntegrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MailboxIntegrationDrawer({
  isOpen,
  onClose,
}: MailboxIntegrationDrawerProps) {
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
              Mailbox Settings
            </h3>
            <p className="text-[11px] text-gray-500">
              Manage connected mailbox accounts and connection status
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 text-xs text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Mailbox Accounts Management Section */}
        <MailboxAccountsSection />
      </div>
    </Drawer>
  );
}

