"use client";

import React from "react";
import { FilterDropdown } from "../ui/FilterDropdown";
import { Menu, RefreshCw } from "lucide-react";
import { FilterOption } from "@/lib/types";

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  onMenuToggle?: () => void;
  onRefresh?: () => void;
  className?: string;
}

const PROCESS_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Processes" },
  { value: "lead-qual", label: "Lead Qualification" },
  { value: "order-conf", label: "Order Confirmation" },
  { value: "support", label: "Customer Support" },
  { value: "booking", label: "Appointment Booking" },
];

const STAGE_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Stages" },
  { value: "initiated", label: "Initiated" },
  { value: "connected", label: "Connected" },
  { value: "completed", label: "Completed" },
  { value: "transferred", label: "Transferred" },
];

const DATE_OPTIONS: FilterOption[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "30d", label: "Last 30 Days" },
  { value: "this-month", label: "This Month" },
];

const CALL_TYPE_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Call Types" },
  { value: "inbound", label: "Inbound AI" },
  { value: "outbound", label: "Outbound Lead" },
  { value: "escalated", label: "Escalated" },
];

export const TopBar: React.FC<TopBarProps> = ({
  title = "Overview Analytics",
  subtitle = "Track performance and automation health",
  showFilters = true,
  onMenuToggle,
  onRefresh,
  className = "",
}) => {
  return (
    <header className={`w-full mb-6 sm:mb-8 flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Page Titles */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Side: 4 Filter Dropdowns Row */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <FilterDropdown
              label="Process"
              options={PROCESS_OPTIONS}
              selectedValue="all"
            />
            <FilterDropdown
              label="Stage"
              options={STAGE_OPTIONS}
              selectedValue="all"
            />
            <FilterDropdown
              label="Date"
              options={DATE_OPTIONS}
              selectedValue="7d"
            />
            <FilterDropdown
              label="Call Type"
              options={CALL_TYPE_OPTIONS}
              selectedValue="all"
            />

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh Data"
                className="p-2 rounded-xl bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/60 hover:border-white text-slate-400 hover:text-[#1456f0] shadow-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
