"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cpu } from "lucide-react";

export default function UsagesPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Usages (LiveKit / Dogra, Cartesia)"
        subtitle="Real-time telemetry, TTS/STT vendor token consumption, and LiveKit room metrics"
        showFilters={true}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Cpu}
          title="Telemetry and vendor usage details"
          description="Detailed breakdown of Cartesia TTS characters, Deepgram/LiveKit streaming seconds, and LLM token usage will appear here."
          actionText="Refresh Telemetry"
          onAction={() => alert("Refresh Telemetry clicked")}
        />
      </GlassCard>
    </div>
  );
}
