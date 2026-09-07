"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard } from "lucide-react";

export default function SubscriptionsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Subscriptions"
        subtitle="Manage recurring customer billing, active plan tiers, and auto-renewals"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={CreditCard}
          title="No active subscriptions found"
          description="Customer membership tiers, monthly recurrent packages, and billing cycle status will be displayed here."
          actionText="Create Subscription Tier"
          onAction={() => alert("Create Subscription Tier clicked")}
        />
      </GlassCard>
    </div>
  );
}
