import React from "react";
import ClientProfile, { type Client } from "../../pages/ClientProfile";

export interface ContactDetailDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  contactId?: string;
  clientId?: string;
  clientIdProp?: string;
  onCloseOverride?: () => void;
  initialOpenState?: { openFormsTab: boolean; formId: number; submissionDate?: string };
}

/**
 * ContactDetailDrawer
 * Path: src/app/components/contacts/ContactDetailDrawer.tsx
 *
 * Drawer component for viewing and editing contact details,
 * categories (Lead, Supplier, Vendor, Client), processes, activities, and custom fields.
 */
export default function ContactDetailDrawer({
  isOpen = true,
  onClose,
  contactId,
  clientId,
  clientIdProp,
  onCloseOverride,
  initialOpenState,
}: ContactDetailDrawerProps) {
  if (!isOpen) return null;

  const targetId = contactId || clientId || clientIdProp;
  const handleClose = onClose || onCloseOverride;

  return (
    <ClientProfile
      clientIdProp={targetId}
      onCloseOverride={handleClose}
      initialOpenState={initialOpenState}
    />
  );
}

export { ContactDetailDrawer };
export type { Client };
