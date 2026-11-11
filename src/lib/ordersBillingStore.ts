/**
 * ordersBillingStore.ts
 * Path: src/lib/ordersBillingStore.ts
 *
 * Centralized mock data store & service for Admin Billing & Orders:
 * - Orders management (line items, payment status, timeline, refunds)
 * - Subscriptions (active plans, MRR, cycle, credits allocation, pause/cancel)
 * - Invoice dataset for Revenue & Invoices analytics aggregation (NO separate invoices page)
 * All mutations record audit logs and persist to localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { recordAuditLog } from "./auditLogsStore";

export type OrderType = "New plan" | "Plan upgrade" | "Credits top-up" | "Team member package" | "Add-on";
export type OrderPaymentStatus = "Paid" | "Pending" | "Failed" | "Refunded";
export type OrderStatus = "Completed" | "Processing" | "Cancelled";

export type SubscriptionStatus = "Active" | "Trial" | "Past due" | "Cancelled" | "Paused";
export type BillingCycle = "Monthly" | "Yearly";

export interface OrderLineItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderTimelineEvent {
  date: string;
  status: string;
  note: string;
  actor?: string;
}

export interface AdminOrderItem {
  id: string; // e.g. "ORD-8841"
  orgId: string;
  orgName: string;
  orgCode: string;
  type: OrderType;
  items: OrderLineItem[];
  amount: number;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  paymentMethod: string;
  createdDate: string; // ISO
  receiptUrl?: string;
  timeline: OrderTimelineEvent[];
}

export interface AdminSubscriptionItem {
  id: string; // e.g. "SUB-2091"
  orgId: string;
  orgName: string;
  orgCode: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  trialEndsDate?: string;
  mrr: number;
  creditsIncluded: number;
  creditsUsed: number;
  additionalNumbers: number;
}

export interface AdminInvoiceItem {
  id: string; // e.g. "INV-2024-001"
  orgId: string;
  orgName: string;
  orgCode: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "Paid" | "Open" | "Overdue" | "Void";
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  planName: string;
  pdfUrl?: string;
}

export const ORDERS_STORAGE_KEY = "mantra_admin_orders";
export const SUBSCRIPTIONS_STORAGE_KEY = "mantra_admin_subscriptions";
export const INVOICES_STORAGE_KEY = "mantra_admin_invoices";
export const ORDERS_BILLING_EVENT = "mantra-orders-billing-updated";

// Seeded Initial Orders
export const INITIAL_ORDERS: AdminOrderItem[] = [
  {
    id: "ORD-8841",
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    type: "New plan",
    items: [
      { id: "li-1", title: "Enterprise Health Scale (Monthly)", quantity: 1, unitPrice: 499.0, total: 499.0 },
      { id: "li-2", title: "Local Inbound DID (+1 415 890 2100)", quantity: 1, unitPrice: 15.0, total: 15.0 },
      { id: "li-3", title: "Toll-Free 800 Line (+1 800 420 9912)", quantity: 1, unitPrice: 25.0, total: 25.0 },
    ],
    amount: 539.0,
    currency: "USD",
    paymentStatus: "Paid",
    orderStatus: "Completed",
    paymentMethod: "Visa •••• 4242",
    createdDate: "2024-04-01T10:14:00.000Z",
    receiptUrl: "https://billing.mantra.care/receipts/ord-8841.pdf",
    timeline: [
      { date: "2024-04-01T10:14:00.000Z", status: "Order Created", note: "Created by Dr. Pasricha at checkout", actor: "Customer" },
      { date: "2024-04-01T10:14:05.000Z", status: "Payment Settled", note: "Stripe Charge ch_3P18a992 completed successfully", actor: "Stripe" },
      { date: "2024-04-01T10:14:06.000Z", status: "Provisioned", note: "Phone numbers and enterprise features unlocked", actor: "System" },
    ],
  },
  {
    id: "ORD-8840",
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    type: "Plan upgrade",
    items: [
      { id: "li-4", title: "AI Clinic Receptionist Pro (Monthly)", quantity: 1, unitPrice: 299.0, total: 299.0 },
      { id: "li-5", title: "India Exotel Virtual DID (+91 80 4719 3200)", quantity: 1, unitPrice: 18.5, total: 18.5 },
    ],
    amount: 317.5,
    currency: "USD",
    paymentStatus: "Paid",
    orderStatus: "Completed",
    paymentMethod: "Mastercard •••• 8812",
    createdDate: "2024-04-03T15:30:00.000Z",
    receiptUrl: "https://billing.mantra.care/receipts/ord-8840.pdf",
    timeline: [
      { date: "2024-04-03T15:30:00.000Z", status: "Order Created", note: "Upgraded from Starter to Pro", actor: "Dr. Pasricha" },
      { date: "2024-04-03T15:30:04.000Z", status: "Payment Settled", note: "Stripe payment succeeded", actor: "Stripe" },
    ],
  },
  {
    id: "ORD-8839",
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    type: "Credits top-up",
    items: [
      { id: "li-6", title: "High-Volume Voice Credit Pack (2,500 Credits)", quantity: 1, unitPrice: 125.0, total: 125.0 },
    ],
    amount: 125.0,
    currency: "USD",
    paymentStatus: "Paid",
    orderStatus: "Completed",
    paymentMethod: "Amex •••• 1004",
    createdDate: "2024-04-08T09:20:00.000Z",
    receiptUrl: "https://billing.mantra.care/receipts/ord-8839.pdf",
    timeline: [
      { date: "2024-04-08T09:20:00.000Z", status: "Order Created", note: "Auto-recharge triggered when balance dropped below 100", actor: "System" },
      { date: "2024-04-08T09:20:03.000Z", status: "Payment Settled", note: "Card charged successfully", actor: "Stripe" },
    ],
  },
  {
    id: "ORD-8838",
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    type: "Credits top-up",
    items: [
      { id: "li-7", title: "High-Volume Voice Credit Pack (5,000 Credits)", quantity: 2, unitPrice: 220.0, total: 440.0 },
    ],
    amount: 440.0,
    currency: "USD",
    paymentStatus: "Paid",
    orderStatus: "Completed",
    paymentMethod: "Visa •••• 4242",
    createdDate: "2024-04-12T11:45:00.000Z",
    receiptUrl: "https://billing.mantra.care/receipts/ord-8838.pdf",
    timeline: [
      { date: "2024-04-12T11:45:00.000Z", status: "Order Created", note: "Purchased manual top-up", actor: "Dr. Pasricha" },
      { date: "2024-04-12T11:45:02.000Z", status: "Payment Settled", note: "Processed immediately", actor: "Stripe" },
    ],
  },
  {
    id: "ORD-8837",
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    type: "Team member package",
    items: [
      { id: "li-8", title: "Additional Staff Seat (5x Team Expansion Pack)", quantity: 1, unitPrice: 75.0, total: 75.0 },
    ],
    amount: 75.0,
    currency: "USD",
    paymentStatus: "Paid",
    orderStatus: "Completed",
    paymentMethod: "Amex •••• 1004",
    createdDate: "2024-04-14T14:10:00.000Z",
    receiptUrl: "https://billing.mantra.care/receipts/ord-8837.pdf",
    timeline: [
      { date: "2024-04-14T14:10:00.000Z", status: "Order Created", note: "Provisioned via Plivo", actor: "Alexander Vance" },
    ],
  },
  {
    id: "ORD-8836",
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    type: "Credits top-up",
    items: [
      { id: "li-9", title: "Voice Credit Pack (1,000 Credits)", quantity: 1, unitPrice: 60.0, total: 60.0 },
    ],
    amount: 60.0,
    currency: "USD",
    paymentStatus: "Pending",
    orderStatus: "Processing",
    paymentMethod: "ACH Direct Debit",
    createdDate: "2024-04-18T16:00:00.000Z",
    timeline: [
      { date: "2024-04-18T16:00:00.000Z", status: "Pending Clearing", note: "Bank transfer awaiting 3-day ACH settlement", actor: "ACH Gateway" },
    ],
  },
];

// Seeded Initial Subscriptions
export const INITIAL_SUBSCRIPTIONS: AdminSubscriptionItem[] = [
  {
    id: "SUB-2091",
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    planId: "plan-ent",
    planName: "Enterprise Health Scale",
    billingCycle: "Monthly",
    status: "Active",
    startDate: "2024-01-15T09:00:00.000Z",
    renewalDate: "2024-05-15T09:00:00.000Z",
    mrr: 539.0,
    creditsIncluded: 10000,
    creditsUsed: 7420,
    additionalNumbers: 2,
  },
  {
    id: "SUB-2092",
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    planId: "plan-pro",
    planName: "AI Clinic Receptionist Pro",
    billingCycle: "Monthly",
    status: "Active",
    startDate: "2024-02-10T10:00:00.000Z",
    renewalDate: "2024-05-10T10:00:00.000Z",
    mrr: 317.5,
    creditsIncluded: 3500,
    creditsUsed: 2980,
    additionalNumbers: 1,
  },
  {
    id: "SUB-2093",
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    planId: "plan-starter",
    planName: "AI Receptionist Starter",
    billingCycle: "Monthly",
    status: "Active",
    startDate: "2024-03-01T12:00:00.000Z",
    renewalDate: "2024-05-01T12:00:00.000Z",
    mrr: 164.0,
    creditsIncluded: 1500,
    creditsUsed: 1210,
    additionalNumbers: 1,
  },
  {
    id: "SUB-2094",
    orgId: "org-4",
    orgName: "Apex Orthopedics Group",
    orgCode: "ORG-0004",
    planId: "plan-pro",
    planName: "AI Clinic Receptionist Pro",
    billingCycle: "Monthly",
    status: "Trial",
    startDate: "2024-04-10T08:00:00.000Z",
    renewalDate: "2024-04-24T08:00:00.000Z",
    trialEndsDate: "2024-04-24T08:00:00.000Z",
    mrr: 299.0,
    creditsIncluded: 1000,
    creditsUsed: 310,
    additionalNumbers: 0,
  },
  {
    id: "SUB-2095",
    orgId: "org-5",
    orgName: "Beacon Dental Spa",
    orgCode: "ORG-0005",
    planId: "plan-starter",
    planName: "AI Receptionist Starter",
    billingCycle: "Monthly",
    status: "Past due",
    startDate: "2024-02-18T10:00:00.000Z",
    renewalDate: "2024-04-18T10:00:00.000Z",
    mrr: 149.0,
    creditsIncluded: 1500,
    creditsUsed: 1500,
    additionalNumbers: 0,
  },
];

// Seeded Invoices for Revenue Analytics Calculation
export const INITIAL_INVOICES: AdminInvoiceItem[] = [
  {
    id: "INV-2024-001",
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    orderId: "ORD-8841",
    amount: 539.0,
    currency: "USD",
    status: "Paid",
    issuedDate: "2024-04-01T10:14:00.000Z",
    dueDate: "2024-04-15T10:14:00.000Z",
    paidDate: "2024-04-01T10:14:05.000Z",
    planName: "Enterprise Health Scale",
    pdfUrl: "https://billing.mantra.care/invoices/inv-001.pdf",
  },
  {
    id: "INV-2024-002",
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    orderId: "ORD-8840",
    amount: 317.5,
    currency: "USD",
    status: "Paid",
    issuedDate: "2024-04-03T15:30:00.000Z",
    dueDate: "2024-04-17T15:30:00.000Z",
    paidDate: "2024-04-03T15:30:04.000Z",
    planName: "AI Clinic Receptionist Pro",
    pdfUrl: "https://billing.mantra.care/invoices/inv-002.pdf",
  },
  {
    id: "INV-2024-003",
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    orderId: "ORD-8839",
    amount: 125.0,
    currency: "USD",
    status: "Paid",
    issuedDate: "2024-04-08T09:20:00.000Z",
    dueDate: "2024-04-22T09:20:00.000Z",
    paidDate: "2024-04-08T09:20:03.000Z",
    planName: "Voice Credit Pack",
  },
  {
    id: "INV-2024-004",
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    orderId: "ORD-8838",
    amount: 440.0,
    currency: "USD",
    status: "Paid",
    issuedDate: "2024-04-12T11:45:00.000Z",
    dueDate: "2024-04-26T11:45:00.000Z",
    paidDate: "2024-04-12T11:45:02.000Z",
    planName: "Voice Credit Pack",
  },
  {
    id: "INV-2024-005",
    orgId: "org-5",
    orgName: "Beacon Dental Spa",
    orgCode: "ORG-0005",
    orderId: "ORD-8834",
    amount: 149.0,
    currency: "USD",
    status: "Overdue",
    issuedDate: "2024-04-04T00:00:00.000Z",
    dueDate: "2024-04-18T00:00:00.000Z",
    planName: "AI Receptionist Starter",
  },
  {
    id: "INV-2024-006",
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    orderId: "ORD-8836",
    amount: 60.0,
    currency: "USD",
    status: "Open",
    issuedDate: "2024-04-18T16:00:00.000Z",
    dueDate: "2024-05-02T16:00:00.000Z",
    planName: "Voice Credit Pack",
  },
];

// Helper functions for reading & writing storage
export function getStoredOrders(): AdminOrderItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_ORDERS;
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_ORDERS;
    return parsed.map((o: any) => ({
      ...o,
      type: (o.type === "Phone number" ? "Team member package" : o.type) as OrderType,
    }));
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(items: AdminOrderItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(ORDERS_BILLING_EVENT));
    }
  } catch (err) {
    console.error("Failed to save orders:", err);
  }
}

export function getStoredSubscriptions(): AdminSubscriptionItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_SUBSCRIPTIONS;
    const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(INITIAL_SUBSCRIPTIONS));
      return INITIAL_SUBSCRIPTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SUBSCRIPTIONS;
  } catch {
    return INITIAL_SUBSCRIPTIONS;
  }
}

export function saveStoredSubscriptions(items: AdminSubscriptionItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(ORDERS_BILLING_EVENT));
    }
  } catch (err) {
    console.error("Failed to save subscriptions:", err);
  }
}

export function getStoredInvoices(): AdminInvoiceItem[] {
  try {
    if (typeof window === "undefined") return INITIAL_INVOICES;
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_INVOICES;
  } catch {
    return INITIAL_INVOICES;
  }
}

// ==========================================
// Administrative Order & Subscriptions Mutations
// ==========================================

export function markOrderPaid(orderId: string, note?: string): AdminOrderItem | null {
  const list = getStoredOrders();
  const idx = list.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminOrderItem = {
    ...prev,
    paymentStatus: "Paid",
    orderStatus: "Completed",
    timeline: [
      {
        date: new Date().toISOString(),
        status: "Marked Paid",
        note: note || "Manually reconciled by Administrator",
        actor: "Admin",
      },
      ...prev.timeline,
    ],
  };

  list[idx] = updated;
  saveStoredOrders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Orders",
    entityType: "Order",
    entityId: updated.id,
    targetName: `${updated.id} (${updated.orgName})`,
    summary: `Manually marked order ${updated.id} as Paid for ${updated.orgName} ($${updated.amount.toFixed(2)})`,
    before: { paymentStatus: prev.paymentStatus, orderStatus: prev.orderStatus },
    after: { paymentStatus: updated.paymentStatus, orderStatus: updated.orderStatus },
  });

  return updated;
}

export function refundOrder(orderId: string, reason: string): AdminOrderItem | null {
  const list = getStoredOrders();
  const idx = list.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminOrderItem = {
    ...prev,
    paymentStatus: "Refunded",
    orderStatus: "Cancelled",
    timeline: [
      {
        date: new Date().toISOString(),
        status: "Refunded",
        note: `Refund issued: ${reason}`,
        actor: "Admin",
      },
      ...prev.timeline,
    ],
  };

  list[idx] = updated;
  saveStoredOrders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "refunded",
    module: "Orders",
    entityType: "Order",
    entityId: updated.id,
    targetName: `${updated.id} (${updated.orgName})`,
    summary: `Issued full refund for order ${updated.id} (${updated.orgName}): ${reason}`,
    before: { paymentStatus: prev.paymentStatus, orderStatus: prev.orderStatus },
    after: { paymentStatus: "Refunded", orderStatus: "Cancelled" },
  });

  return updated;
}

export function cancelOrder(orderId: string, reason: string): AdminOrderItem | null {
  const list = getStoredOrders();
  const idx = list.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminOrderItem = {
    ...prev,
    orderStatus: "Cancelled",
    timeline: [
      {
        date: new Date().toISOString(),
        status: "Cancelled",
        note: `Order cancelled: ${reason}`,
        actor: "Admin",
      },
      ...prev.timeline,
    ],
  };

  list[idx] = updated;
  saveStoredOrders(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Orders",
    entityType: "Order",
    entityId: updated.id,
    targetName: `${updated.id} (${updated.orgName})`,
    summary: `Cancelled order ${updated.id} for ${updated.orgName}: ${reason}`,
    before: { orderStatus: prev.orderStatus },
    after: { orderStatus: "Cancelled" },
  });

  return updated;
}

export function changeSubscriptionPlan(
  subId: string,
  newPlanId: string,
  newPlanName: string,
  newMrr: number,
  newCredits: number
): AdminSubscriptionItem | null {
  const list = getStoredSubscriptions();
  const idx = list.findIndex((s) => s.id === subId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminSubscriptionItem = {
    ...prev,
    planId: newPlanId,
    planName: newPlanName,
    mrr: newMrr,
    creditsIncluded: newCredits,
    status: "Active",
  };

  list[idx] = updated;
  saveStoredSubscriptions(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: updated.id,
    targetName: updated.orgName,
    summary: `Changed subscription plan for ${updated.orgName} from ${prev.planName} ($${prev.mrr}/mo) to ${newPlanName} ($${newMrr}/mo)`,
    before: { planName: prev.planName, mrr: prev.mrr, creditsIncluded: prev.creditsIncluded },
    after: { planName: updated.planName, mrr: updated.mrr, creditsIncluded: updated.creditsIncluded },
  });

  return updated;
}

export function pauseSubscription(subId: string): AdminSubscriptionItem | null {
  const list = getStoredSubscriptions();
  const idx = list.findIndex((s) => s.id === subId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminSubscriptionItem = {
    ...prev,
    status: "Paused",
  };

  list[idx] = updated;
  saveStoredSubscriptions(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "suspended",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: updated.id,
    targetName: updated.orgName,
    summary: `Paused active subscription billing for ${updated.orgName}`,
    before: { status: prev.status },
    after: { status: "Paused" },
  });

  return updated;
}

export function cancelSubscription(subId: string, reason?: string): AdminSubscriptionItem | null {
  const list = getStoredSubscriptions();
  const idx = list.findIndex((s) => s.id === subId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminSubscriptionItem = {
    ...prev,
    status: "Cancelled",
  };

  list[idx] = updated;
  saveStoredSubscriptions(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "deleted",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: updated.id,
    targetName: updated.orgName,
    summary: `Cancelled subscription for ${updated.orgName}: ${reason || "Administrative cancellation"}`,
    before: { status: prev.status },
    after: { status: "Cancelled" },
  });

  return updated;
}

export function extendSubscriptionTrial(subId: string, additionalDays: number): AdminSubscriptionItem | null {
  const list = getStoredSubscriptions();
  const idx = list.findIndex((s) => s.id === subId);
  if (idx === -1) return null;

  const prev = list[idx];
  const baseDate = prev.trialEndsDate ? new Date(prev.trialEndsDate) : new Date();
  const newDate = new Date(baseDate.getTime() + additionalDays * 86400 * 1000).toISOString();

  const updated: AdminSubscriptionItem = {
    ...prev,
    status: "Trial",
    trialEndsDate: newDate,
    renewalDate: newDate,
  };

  list[idx] = updated;
  saveStoredSubscriptions(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: updated.id,
    targetName: updated.orgName,
    summary: `Extended trial by ${additionalDays} days for ${updated.orgName} until ${new Date(newDate).toLocaleDateString()}`,
    before: { trialEndsDate: prev.trialEndsDate },
    after: { trialEndsDate: updated.trialEndsDate },
  });

  return updated;
}

export function addSubscriptionCredits(subId: string, extraCredits: number): AdminSubscriptionItem | null {
  const list = getStoredSubscriptions();
  const idx = list.findIndex((s) => s.id === subId);
  if (idx === -1) return null;

  const prev = list[idx];
  const updated: AdminSubscriptionItem = {
    ...prev,
    creditsIncluded: prev.creditsIncluded + extraCredits,
  };

  list[idx] = updated;
  saveStoredSubscriptions(list);

  recordAuditLog({
    actorId: "usr-admin-1",
    actorName: "Alexander Vance",
    actorEmail: "alexander.v@mantra.care",
    actorRole: "SystemAdmin",
    action: "updated",
    module: "Subscriptions",
    entityType: "Subscription",
    entityId: updated.id,
    targetName: updated.orgName,
    summary: `Added ${extraCredits.toLocaleString()} bonus voice/workflow credits to ${updated.orgName}`,
    before: { creditsIncluded: prev.creditsIncluded },
    after: { creditsIncluded: updated.creditsIncluded },
  });

  return updated;
}

// React Hooks
export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrderItem[]>(getStoredOrders);

  const refresh = useCallback(() => {
    setOrders(getStoredOrders());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ORDERS_BILLING_EVENT, handler);
    return () => window.removeEventListener(ORDERS_BILLING_EVENT, handler);
  }, [refresh]);

  return { orders, refresh };
}

export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>(getStoredSubscriptions);

  const refresh = useCallback(() => {
    setSubscriptions(getStoredSubscriptions());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ORDERS_BILLING_EVENT, handler);
    return () => window.removeEventListener(ORDERS_BILLING_EVENT, handler);
  }, [refresh]);

  return { subscriptions, refresh };
}

export function useAdminInvoicesData() {
  const [invoices, setInvoices] = useState<AdminInvoiceItem[]>(getStoredInvoices);

  const refresh = useCallback(() => {
    setInvoices(getStoredInvoices());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ORDERS_BILLING_EVENT, handler);
    return () => window.removeEventListener(ORDERS_BILLING_EVENT, handler);
  }, [refresh]);

  return { invoices, refresh };
}

