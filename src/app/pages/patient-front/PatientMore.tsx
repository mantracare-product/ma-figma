import React, { useState, useEffect } from "react";
import { FileText, CreditCard, User, ChevronRight, ArrowLeft } from "lucide-react";
import PatientDocuments from "./PatientDocuments";
import PatientBilling from "./PatientBilling";
import PatientProfile from "./PatientProfile";

export type MoreSection = "documents" | "billing" | "profile" | "menu";

interface PatientMoreProps {
  clientId: string;
  clientName: string;
  initialSection?: "documents" | "billing" | "profile" | null;
  onSectionChange?: (section: "documents" | "billing" | "profile" | null) => void;
  onSelectClient?: (id: string) => void;
}

const MENU_ITEMS = [
  { id: "documents" as const, label: "Documents and Forms", icon: FileText },
  { id: "billing" as const, label: "Billing", icon: CreditCard },
  { id: "profile" as const, label: "Profile", icon: User },
];

export default function PatientMore({
  clientId,
  clientName,
  initialSection = null,
  onSectionChange,
  onSelectClient,
}: PatientMoreProps) {
  const [activeSection, setActiveSection] = useState<"documents" | "billing" | "profile" | null>(
    initialSection
  );

  useEffect(() => {
    if (initialSection !== undefined) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const handleSelect = (section: "documents" | "billing" | "profile" | null) => {
    setActiveSection(section);
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  // If a subpage is open, render the subpage with back navigation
  if (activeSection) {
    return (
      <div className="w-full space-y-4 select-none animate-in fade-in duration-200">
        <div>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-[#1456f0] hover:text-blue-700 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>More</span>
          </button>
        </div>

        <div>
          {activeSection === "documents" && (
            <PatientDocuments clientId={clientId} clientName={clientName} />
          )}
          {activeSection === "billing" && (
            <PatientBilling clientId={clientId} clientName={clientName} />
          )}
          {activeSection === "profile" && (
            <PatientProfile
              clientId={clientId}
              onSelectClient={onSelectClient || (() => {})}
            />
          )}
        </div>
      </div>
    );
  }

  // Root More page: Flat list of three plain rows (Rule §2)
  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header — Rule 0 & §2 */}
      <div>
        <h1 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-white">
          More
        </h1>
      </div>

      {/* Flat List of 3 plain rows */}
      <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-[#1456f0] transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
