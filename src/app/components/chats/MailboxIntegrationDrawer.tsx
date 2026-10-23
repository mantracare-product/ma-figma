import React, { useState } from "react";
import { Mail, Check } from "lucide-react";
import { Drawer } from "../ui/drawer";
import { toast } from "sonner";
import MailboxAccountsSection from "../settings/MailboxAccountsSection";

interface MailboxIntegrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MailboxIntegrationDrawer({
  isOpen,
  onClose,
}: MailboxIntegrationDrawerProps) {
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
              Manage multiple mailbox accounts and CRM email synchronization
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
        {/* Multiple Accounts Management Section */}
        <MailboxAccountsSection />

        {/* Email & CRM Integration Checkboxes */}
        <div className="pt-2 space-y-4 border-t border-gray-200">
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
