"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Megaphone } from "lucide-react";

export default function CampaignsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Campaigns"
        subtitle="Manage outbound dialing campaigns, contact lists, schedules, and agent personas"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Megaphone}
          title="No data yet for Campaigns"
          description="You have no active or scheduled campaigns. Set up an outbound campaign to start automated calling sequences."
          actionText="Launch New Campaign"
          onAction={() => alert("Launch New Campaign clicked")}
        />
      </GlassCard>
    </div>
  );
}
