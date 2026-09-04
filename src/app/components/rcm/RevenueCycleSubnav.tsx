import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  FileCheck,
  FileText,
  CreditCard,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Landmark,
  Kanban,
  FileSearch,
} from "lucide-react";
import { useRcm } from "../../context/RcmContext";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeVariant?: "critical" | "warning" | "info" | "neutral";
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isParent?: boolean;
  defaultPath?: string;
  items: NavItem[];
}

export default function RevenueCycleSubnav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { claims, encounters, denialClusters, remittanceLines } = useRcm();

  // Counts for worklists
  const denialsCount = denialClusters.reduce((acc, c) => acc + c.claims.filter(cl => cl.status === "denied").length, 0);
  const rejectionsCount = claims.filter((c) => c.status === "rejected").length;
  const pendingDocsCount = encounters.filter((e) => e.status === "pending_documentation").length;
  const pendingPostingCount = remittanceLines.filter((r) => r.status === "pending_review").length;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    daily_work: true,
    worklists: true,
    insights: false,
    automation: false,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isPathActive = (path: string) => {
    if (path === "/revenue-cycle" || path === "/revenue-cycle/overview") {
      return (
        location.pathname === "/revenue-cycle" ||
        location.pathname === "/revenue-cycle/" ||
        location.pathname === "/revenue-cycle/overview"
      );
    }
    return location.pathname === path;
  };

  return (
    <div
      className="w-[245px] flex-shrink-0 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[28px] p-3.5 space-y-2 sticky top-6 self-start"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* Header Label matching Settings screenshot */}
      <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] font-display">
        REVENUE CYCLE
      </div>

      <nav className="space-y-1">
        {/* Overview Item */}
        <button
          type="button"
          onClick={() => navigate("/revenue-cycle")}
          className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isPathActive("/revenue-cycle")
              ? "text-white shadow-sm"
              : "text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60"
          }`}
        >
          {isPathActive("/revenue-cycle") && (
            <motion.div
              layoutId="rcmNavActivePill"
              className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <div className="flex items-center gap-3 min-w-0">
            <Landmark
              className={`w-4 h-4 flex-shrink-0 ${
                isPathActive("/revenue-cycle") ? "text-white" : "text-slate-500"
              }`}
            />
            <span className="truncate">Revenue Overview</span>
          </div>
        </button>

        {/* ── Daily Work (Parent Group) ── */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup("daily_work")}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">Daily Operations</span>
            </div>
            <span className="text-slate-400">
              {expandedGroups["daily_work"] ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {expandedGroups["daily_work"] && (
            <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
              {[
                { label: "Insurance Intake", path: "/revenue-cycle/insurance-intake", icon: FileSearch },
                { label: "Pre-Visit & Eligibility", path: "/revenue-cycle/eligibility", icon: ShieldCheck },
                { label: "Encounters", path: "/revenue-cycle/encounters", icon: FileCheck },
                { label: "Claims", path: "/revenue-cycle/claims", icon: FileText },
                { label: "Invoicing & Billing", path: "/revenue-cycle/billing", icon: CreditCard },
                { label: "Patient Balances", path: "/revenue-cycle/patient-balances", icon: DollarSign },
              ].map((item) => {
                const active = isPathActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "text-white font-semibold shadow-xs"
                        : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="rcmNavActivePill"
                        className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Worklists (Parent Group) ── */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup("worklists")}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Kanban className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">Worklists</span>
            </div>
            <span className="text-slate-400">
              {expandedGroups["worklists"] ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {expandedGroups["worklists"] && (
            <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
              {[
                { label: "Denials (Board)", path: "/revenue-cycle/worklist/denials", icon: Kanban, count: denialsCount, variant: "critical" },
                { label: "Rejections", path: "/revenue-cycle/worklist/rejections", icon: XCircle, count: rejectionsCount, variant: "critical" },
                { label: "Payment Posting", path: "/revenue-cycle/worklist/posting", icon: CheckCircle2, count: pendingPostingCount, variant: "warning" },
                { label: "Pending Docs", path: "/revenue-cycle/worklist/pending-docs", icon: Clock, count: pendingDocsCount, variant: "warning" },
              ].map((item) => {
                const active = isPathActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "text-white font-semibold shadow-xs"
                        : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="rcmNavActivePill"
                        className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                          active
                            ? "bg-white/20 text-white"
                            : item.variant === "critical"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Credentialing ── */}
        <button
          type="button"
          onClick={() => navigate("/revenue-cycle/credentialing")}
          className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isPathActive("/revenue-cycle/credentialing")
              ? "text-white shadow-sm"
              : "text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60"
          }`}
        >
          {isPathActive("/revenue-cycle/credentialing") && (
            <motion.div
              layoutId="rcmNavActivePill"
              className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <div className="flex items-center gap-3 min-w-0">
            <FileSearch
              className={`w-4 h-4 flex-shrink-0 ${
                isPathActive("/revenue-cycle/credentialing") ? "text-white" : "text-slate-500"
              }`}
            />
            <span className="truncate">Payer Credentialing</span>
          </div>
        </button>

        {/* ── Insights & Analytics (Parent Group) ── */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup("insights")}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <BarChart3 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">Insights & Analytics</span>
            </div>
            <span className="text-slate-400">
              {expandedGroups["insights"] ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {expandedGroups["insights"] && (
            <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
              {[
                { label: "Payer Performance", path: "/revenue-cycle/payer-performance", icon: TrendingUp },
                { label: "Revenue Analysis", path: "/revenue-cycle/revenue-analysis", icon: BarChart3 },
              ].map((item) => {
                const active = isPathActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "text-white font-semibold shadow-xs"
                        : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="rcmNavActivePill"
                        className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Automation & Rules (Parent Group) ── */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup("automation")}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold text-[#45515e] hover:text-[#222222] hover:bg-slate-100/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Sliders className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">Automation & Rules</span>
            </div>
            <span className="text-slate-400">
              {expandedGroups["automation"] ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {expandedGroups["automation"] && (
            <div className="ml-7 my-1 pl-2 border-l border-slate-200/60 space-y-1">
              {[
                { label: "Scrubbing Rules", path: "/revenue-cycle/automation/rules", icon: Sliders },
                { label: "Prior Authorizations", path: "/revenue-cycle/automation/prior-auth", icon: FileCheck },
                { label: "Fee Schedule", path: "/revenue-cycle/automation/fee-schedule", icon: DollarSign },
              ].map((item) => {
                const active = isPathActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "text-white font-semibold shadow-xs"
                        : "text-[#64748b] hover:text-[#181e25] hover:bg-slate-100/60"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="rcmNavActivePill"
                        className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
