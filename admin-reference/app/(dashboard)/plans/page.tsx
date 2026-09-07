"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard } from "lucide-react";

export default function PlansPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Plans"
        subtitle="Manage subscription tiers, voice minutes quota, telephony rate cards, and billing"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={CreditCard}
          title="No data yet for Plans"
          description="Subscription plans and custom enterprise pricing configurations will be displayed here."
          actionText="View Subscription Plans"
          onAction={() => alert("View Subscription Plans clicked")}
        />
      </GlassCard>
    </div>
  );
}
