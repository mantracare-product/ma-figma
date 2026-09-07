"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";

export default function SystemLogsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="System Logs"
        subtitle="Audit trails, API request latency metrics, error stack traces, and webhook delivery logs"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={ScrollText}
          title="No data yet for System Logs"
          description="Real-time execution logs, telephony handshake events, and error traces will be captured and displayed here."
          actionText="Configure Log Streams"
          onAction={() => alert("Configure Log Streams clicked")}
        />
      </GlassCard>
    </div>
  );
}
