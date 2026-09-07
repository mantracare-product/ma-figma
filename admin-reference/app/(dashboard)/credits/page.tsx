"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Coins } from "lucide-react";

export default function CreditsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Credits & Transactions"
        subtitle="Track voice minute usage, ledger balances, and payment transaction history"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Coins}
          title="No transaction history"
          description="Voice credit top-ups, wallet deductions, and invoice receipts will be recorded here."
          actionText="Add Credits"
          onAction={() => alert("Add Credits clicked")}
        />
      </GlassCard>
    </div>
  );
}
