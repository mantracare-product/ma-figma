"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart } from "lucide-react";

export default function OrdersPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Orders"
        subtitle="Review order confirmation calls, delivery verifications, and voice transaction records"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={ShoppingCart}
          title="No data yet for Orders"
          description="Inbound and outbound orders confirmed by voice agents will appear here with verification logs."
          actionText="Sync Order Feed"
          onAction={() => alert("Sync Order Feed clicked")}
        />
      </GlassCard>
    </div>
  );
}
