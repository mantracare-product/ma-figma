import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import {
  Users,
  Calendar,
  Building2,
  Workflow,
  FileText,
  Headphones,
  MessageSquare,
  Layers,
  Shield,
  Sparkles,
  Settings,
} from "lucide-react";

interface PageConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: string[];
  satellites: { label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  clients: {
    title: "Contacts & Clients",
    icon: Users,
    statuses: ["Contacts", "Patient Records", "Pipelines", "Timeline Activity"],
    satellites: [
      { label: "Contacts", icon: Users },
      { label: "Records", icon: FileText },
      { label: "Pipelines", icon: Workflow },
      { label: "Timeline", icon: Sparkles },
    ],
  },
  overview: {
    title: "Overview",
    icon: Building2,
    statuses: ["Practice Overview", "Analytics", "Metrics", "Team Activity"],
    satellites: [
      { label: "Metrics", icon: Building2 },
      { label: "Activity", icon: Sparkles },
      { label: "Analytics", icon: Layers },
      { label: "Schedules", icon: Calendar },
    ],
  },
  appointments: {
    title: "Appointments",
    icon: Calendar,
    statuses: ["Calendar", "Schedules", "Provider Availability", "Consultations"],
    satellites: [
      { label: "Calendar", icon: Calendar },
      { label: "Providers", icon: Users },
      { label: "Bookings", icon: Sparkles },
      { label: "Reminders", icon: Headphones },
    ],
  },
  process: {
    title: "Workflows",
    icon: Workflow,
    statuses: ["Pipelines", "Automations", "Trigger Rules", "Active Stages"],
    satellites: [
      { label: "Pipelines", icon: Workflow },
      { label: "Automations", icon: Sparkles },
      { label: "Stages", icon: Layers },
      { label: "Triggers", icon: Settings },
    ],
  },
  "call-logs": {
    title: "Call Logs",
    icon: Headphones,
    statuses: ["Telephony", "Voice Recordings", "Transcriptions", "Call Metrics"],
    satellites: [
      { label: "Telephony", icon: Headphones },
      { label: "Audio", icon: Sparkles },
      { label: "Transcripts", icon: FileText },
      { label: "Routing", icon: Workflow },
    ],
  },
  chats: {
    title: "Chats & Messaging",
    icon: MessageSquare,
    statuses: ["Conversations", "WhatsApp", "SMS Channels", "Web Chat"],
    satellites: [
      { label: "WhatsApp", icon: MessageSquare },
      { label: "SMS", icon: Sparkles },
      { label: "Inbox", icon: Users },
      { label: "Live Agents", icon: Headphones },
    ],
  },
  scribe: {
    title: "AI Scribe",
    icon: FileText,
    statuses: ["Clinical Scribe", "Audio Capture", "SOAP Notes", "EHR Sync"],
    satellites: [
      { label: "SOAP Notes", icon: FileText },
      { label: "Audio", icon: Headphones },
      { label: "Coding", icon: Sparkles },
      { label: "Summary", icon: Layers },
    ],
  },
  claims: {
    title: "Insurance Claims",
    icon: Shield,
    statuses: ["EDI 837P Claims", "Clearinghouse", "Eligibility", "AR Followup"],
    satellites: [
      { label: "Claims", icon: Shield },
      { label: "Payer EDI", icon: FileText },
      { label: "Benefits", icon: Sparkles },
      { label: "Billing", icon: Layers },
    ],
  },
  settings: {
    title: "Settings",
    icon: Settings,
    statuses: ["Organization", "Members & Roles", "Telephony Gateway", "Billing"],
    satellites: [
      { label: "Organization", icon: Building2 },
      { label: "Members", icon: Users },
      { label: "Gateway", icon: Headphones },
      { label: "Security", icon: Shield },
    ],
  },
};

const DEFAULT_CONFIG: PageConfig = {
  title: "Workspace",
  icon: Layers,
  statuses: ["Workspace", "Records", "Data Store", "Secure Sync"],
  satellites: [
    { label: "Workspace", icon: Layers },
    { label: "Records", icon: FileText },
    { label: "Database", icon: Building2 },
    { label: "Sync", icon: Sparkles },
  ],
};

export default function PageContentLoader() {
  const location = useLocation();

  const config = useMemo(() => {
    const path = location.pathname.toLowerCase();
    for (const [key, val] of Object.entries(PAGE_CONFIGS)) {
      if (path.includes(key)) return val;
    }
    return DEFAULT_CONFIG;
  }, [location.pathname]);

  const [activeStage, setActiveStage] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Rotate stages and typewriter
  useEffect(() => {
    const currentWord = config.statuses[wordIdx] || config.title;
    const isLastWord = wordIdx === config.statuses.length - 1;

    let timeout: any;
    if (!isDeleting) {
      if (typedText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setTypedText(currentWord.slice(0, typedText.length + 1));
        }, 34);
      } else if (!isLastWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 700);
      }
    } else {
      if (typedText.length > 0) {
        timeout = setTimeout(() => {
          setTypedText(currentWord.slice(0, typedText.length - 1));
        }, 18);
      } else {
        setIsDeleting(false);
        const nextIdx = (wordIdx + 1) % config.statuses.length;
        setWordIdx(nextIdx);
        setActiveStage(nextIdx);
      }
    }
    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, wordIdx, config]);

  const CenterIcon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full py-12 select-none animate-in fade-in duration-300">
      {/* Concentric Precision Rings & Orbiting Nodes */}
      <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
        {/* Dynamic SVG Connection Beams */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="14%"
            stroke={activeStage >= 0 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeStage >= 0 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-300"
          />
          <line
            x1="50%"
            y1="50%"
            x2="15%"
            y2="50%"
            stroke={activeStage >= 1 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeStage >= 1 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-300"
          />
          <line
            x1="50%"
            y1="50%"
            x2="85%"
            y2="50%"
            stroke={activeStage >= 2 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeStage >= 2 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-300"
          />
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="86%"
            stroke={activeStage >= 3 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeStage >= 3 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-300"
          />
        </svg>

        {/* Concentric Rotating Precision Rings */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
          <div className="absolute inset-0 border border-dashed border-slate-300 rounded-full animate-[spin_24s_linear_infinite]" />
          <div className="absolute inset-4 border border-dashed border-slate-200 rounded-full animate-[spin_32s_linear_infinite_reverse]" />
          <div className="absolute inset-9 border border-slate-200/60 rounded-full" />

          {/* Center core node */}
          <div
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-[#182230] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(24,34,48,0.18)]"
            style={{
              animation: "pulseCore 2.4s ease-in-out infinite",
            }}
          >
            <style>{`
              @keyframes pulseCore {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}</style>
            <CenterIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[1.8]" />
          </div>

          {/* 4 Orbiting Satellite Badges */}
          {config.satellites.map((sat, idx) => {
            const SatIcon = sat.icon;
            const isActive = activeStage === idx;

            // Positioning for 4 satellites: top, left, right, bottom
            const posClass =
              idx === 0
                ? "-top-4 left-1/2 -translate-x-1/2"
                : idx === 1
                ? "-left-10 sm:-left-12 top-1/2 -translate-y-1/2"
                : idx === 2
                ? "-right-10 sm:-right-12 top-1/2 -translate-y-1/2"
                : "-bottom-4 left-1/2 -translate-x-1/2";

            return (
              <div
                key={sat.label}
                className={`absolute ${posClass} px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 flex items-center gap-1.5 shadow-2xs ${
                  isActive
                    ? "bg-white border-slate-300 text-slate-900 shadow-xs scale-105"
                    : "bg-white/80 border-slate-200/80 text-slate-400"
                }`}
              >
                <SatIcon
                  className={`w-3.5 h-3.5 transition-colors duration-300 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="hidden sm:inline">{sat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Typewriter Status Text */}
      <div className="flex items-center justify-center text-sm font-medium text-slate-500 mt-6 tracking-tight select-none">
        <span>Loading&nbsp;</span>
        <span className="font-semibold text-slate-900 inline-flex items-center">
          {typedText}
          <span className="inline-block w-[2px] h-4 bg-slate-900 ml-1 animate-pulse" />
        </span>
      </div>
    </div>
  );
}
