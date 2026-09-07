"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export default function UserManagementPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <TopBar
        title="User Management"
        subtitle="Manage administrator roles, organization team members, API access keys, and permissions"
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      <GlassCard variant="default" rounded="3xl" padding="xl">
        <EmptyState
          icon={Users}
          title="No data yet for User Management"
          description="Invite team members, assign role-based access control (RBAC), and manage security credentials."
          actionText="Invite Team Member"
          onAction={() => alert("Invite Team Member clicked")}
        />
      </GlassCard>
    </div>
  );
}
