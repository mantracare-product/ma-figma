"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cpu } from "lucide-react";

export default function IntegrationsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Integrations"
        subtitle="Connect CRM systems, telephony providers (Twilio, SIP), webhooks, and AI LLM endpoints"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Cpu}
          title="No data yet for Integrations"
          description="Connect your CRM (Salesforce, HubSpot), telephony trunks (Twilio, Vonage), or custom API webhooks."
          actionText="Add New Integration"
          onAction={() => alert("Add New Integration clicked")}
        />
      </GlassCard>
    </div>
  );
}
