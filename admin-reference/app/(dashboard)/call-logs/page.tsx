"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhoneCall } from "lucide-react";

export default function CallLogsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Call Logs"
        subtitle="Complete historical voice session logs, audio recordings, and transcripts"
        showFilters={true}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={PhoneCall}
          title="No call logs available"
          description="Inbound AI and outbound campaign calls will appear here with full duration, audio replay, and transcript analysis."
          actionText="Simulate Inbound Call"
          onAction={() => alert("Simulate Call clicked")}
        />
      </GlassCard>
    </div>
  );
}
