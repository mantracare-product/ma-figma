"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav-items";
import {
  LogOut,
  X,
  ChevronDown,
} from "lucide-react";

export interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();

  // Accordion state: all dropdown groups open by default, can be toggled
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    setup: true,
    corporate: true,
    settings: true,
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <>
      {/* Backdrop Overlay (Starts below header) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed top-14 inset-x-0 bottom-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container (Starts below header) */}
      <aside
        className={`
          fixed top-14 bottom-0 left-0 z-40 w-72 flex flex-col justify-between
          bg-[#fafafa] border-r border-slate-200/80 shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Middle Nav List with Accordion Dropdowns */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
          {NAV_GROUPS.map((group) => {
            const isGroupOpen = openGroups[group.id] ?? true;
            const hasActiveItem = group.items.some(
              (item) =>
                pathname === item.href ||
                (item.href === "/analytics" && (pathname === "/" || pathname === "/analytics"))
            );

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Accordion Header / Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-1.5 rounded-xl
                    text-left transition-colors duration-150 group/header
                    hover:bg-slate-200/50
                  `}
                >
                  <span
                    className={`
                      text-[11px] font-bold uppercase tracking-wider transition-colors
                      ${hasActiveItem ? "text-[#181e25]" : "text-[#8e8e93] group-hover/header:text-[#181e25]"}
                    `}
                  >
                    {group.label}
                  </span>
                  <ChevronDown
                    className={`
                      w-3.5 h-3.5 text-slate-400 transition-transform duration-200
                      ${isGroupOpen ? "transform rotate-0" : "transform -rotate-90 text-slate-300"}
                      group-hover/header:text-[#181e25]
                    `}
                  />
                </button>

                {/* Group Items Dropdown */}
                {isGroupOpen && (
                  <nav className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href === "/analytics" && (pathname === "/" || pathname === "/analytics"));

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={onClose}
                          className={`
                            group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium
                            transition-all duration-150
                            ${
                              isActive
                                ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm shadow-slate-900/10 font-semibold"
                                : "text-[#45515e] hover:text-[#181e25] hover:bg-white/80"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                                isActive
                                  ? "text-white"
                                  : "text-slate-400 group-hover:text-[#1456f0]"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`
                                text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-blue-50 text-[#1456f0]"
                                }
                              `}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Pinned Log Out */}
        <div className="p-4 border-t border-slate-200/60">
          <button
            type="button"
            className="
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full
              text-xs font-semibold text-[#45515e] hover:text-rose-600
              bg-white/60 hover:bg-rose-50/80 backdrop-blur-md
              border border-white/80 hover:border-rose-200/60 shadow-xs
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-rose-500/30
            "
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
