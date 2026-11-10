import React from "react";
import PageHeader from "../../components/layout/PageHeader";
import SecurityTab from "../../components/settings/SecurityTab";

export default function AdminSecurity() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Access Policies"
        subtitle="Manage global two-factor authentication requirements, active administrative sessions, and access credentials"
      />

      <div className="max-w-4xl">
        <SecurityTab />
      </div>
    </div>
  );
}

