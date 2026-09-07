"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building2 } from "lucide-react";

export default function OrganizationsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="Organizations"
        subtitle="Manage multi-tenant corporate accounts, business units, and branch divisions"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Building2}
          title="Organization directory"
          description="Enterprise tenant accounts, sub-organizations, and branch settings are configured here."
          actionText="Add New Organization"
          onAction={() => alert("Add Organization clicked")}
        />
      </GlassCard>
    </div>
  );
}
