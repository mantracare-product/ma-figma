/**
 * AdminOrders.tsx
 * Path: src/app/pages/admin/AdminOrders.tsx
 *
 * Dedicated Admin Console for Billing & Orders:
 * - Orders inventory across all organizations
 * - Summary KPI cards (Total Orders, Settled Volume, Pending, Refunds)
 * - 32px dark-header table with mono chips and tabular numbers
 * - Order Detail Drawer: Line items, payment method, audit timeline
 * - Actions: Mark Paid, Refund, Cancel (all write audit logs)
 * - CSV export
 */

import React, { useState, useMemo } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";
import {
  useAdminOrders,
  AdminOrderItem,
  OrderType,
  OrderPaymentStatus,
  OrderStatus,
  markOrderPaid,
  refundOrder,
  cancelOrder,
} from "../../../lib/ordersBillingStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  ShoppingCart,
  DollarSign,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  XCircle,
  FileText,
  CreditCard,
  Building2,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "../../../lib/productAnalyticsStore";
import MetricCapsuleRow from "../../components/ui/MetricCapsuleRow";

export default function AdminOrders() {
  const { orders, refresh } = useAdminOrders();
  const { organizations } = useOrganization();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderItem | null>(null);

  // Refund Modal State
  const [orderToRefund, setOrderToRefund] = useState<AdminOrderItem | null>(null);
  const [refundReason, setRefundReason] = useState("");

  // Cancel Modal State
  const [orderToCancel, setOrderToCancel] = useState<AdminOrderItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Filtered dataset
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (typeFilter !== "all" && ord.type !== typeFilter) return false;
      if (paymentStatusFilter !== "all" && ord.paymentStatus !== paymentStatusFilter) return false;
      if (orderStatusFilter !== "all" && ord.orderStatus !== orderStatusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = ord.id.toLowerCase().includes(q);
        const matchesOrg = ord.orgName.toLowerCase().includes(q);
        const matchesCode = ord.orgCode.toLowerCase().includes(q);
        const matchesMethod = ord.paymentMethod.toLowerCase().includes(q);
        if (!matchesId && !matchesOrg && !matchesCode && !matchesMethod) return false;
      }

      return true;
    });
  }, [orders, typeFilter, paymentStatusFilter, orderStatusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const settledAmount = orders
      .filter((o) => o.paymentStatus === "Paid")
      .reduce((acc, o) => acc + o.amount, 0);
    const pendingCount = orders.filter((o) => o.paymentStatus === "Pending").length;
    const refundedAmount = orders
      .filter((o) => o.paymentStatus === "Refunded")
      .reduce((acc, o) => acc + o.amount, 0);

    return { totalCount, settledAmount, pendingCount, refundedAmount };
  }, [orders]);

  // Handlers
  const handleMarkPaid = (item: AdminOrderItem) => {
    if (confirm(`Mark order ${item.id} ($${item.amount.toFixed(2)}) as Paid?`)) {
      markOrderPaid(item.id, "Reconciled manually in Admin Console");
      refresh();
      if (selectedOrder?.id === item.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: "Paid", orderStatus: "Completed" } : null));
      }
      toast.success(`Order ${item.id} marked as Paid`);
    }
  };

  const handleConfirmRefund = () => {
    if (!orderToRefund || !refundReason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    refundOrder(orderToRefund.id, refundReason);
    refresh();
    if (selectedOrder?.id === orderToRefund.id) {
      setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: "Refunded", orderStatus: "Cancelled" } : null));
    }
    setOrderToRefund(null);
    setRefundReason("");
    toast.success(`Refund issued for order ${orderToRefund.id}`);
  };

  const handleConfirmCancel = () => {
    if (!orderToCancel || !cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    cancelOrder(orderToCancel.id, cancelReason);
    refresh();
    if (selectedOrder?.id === orderToCancel.id) {
      setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: "Cancelled" } : null));
    }
    setOrderToCancel(null);
    setCancelReason("");
    toast.success(`Cancelled order ${orderToCancel.id}`);
  };

  const handleExportCsv = () => {
    const headers = [
      "Order ID",
      "Organization",
      "Org ID",
      "Type",
      "Items Count",
      "Amount ($)",
      "Payment Status",
      "Order Status",
      "Payment Method",
      "Created Date",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.orgName,
      o.orgCode,
      o.type,
      o.items.length,
      `$${o.amount.toFixed(2)}`,
      o.paymentStatus,
      o.orderStatus,
      o.paymentMethod,
      new Date(o.createdDate).toLocaleDateString(),
    ]);
    exportToCsv("mantra-orders-billing-inventory", headers, rows);
    toast.success("Exported orders report to CSV");
  };

  // Table Columns
  const columns: TableColumn<AdminOrderItem>[] = [
    {
      key: "id",
      header: "ORDER ID",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900 text-xs tabular-nums">
          {row.id}
        </span>
      ),
    },
    {
      key: "createdDate",
      header: "DATE",
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono tabular-nums whitespace-nowrap">
          {new Date(row.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "orgCode",
      header: "ORG ID",
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
          {row.orgCode}
        </span>
      ),
    },
    {
      key: "orgName",
      header: "ORGANIZATION",
      render: (row) => (
        <span className="text-xs font-medium text-gray-900 truncate max-w-[170px] block" title={row.orgName}>
          {row.orgName}
        </span>
      ),
    },
    {
      key: "type",
      header: "ORDER TYPE",
      render: (row) => {
        let badgeColor = "bg-slate-100 text-slate-700";
        if (row.type === "New plan") badgeColor = "bg-emerald-50 text-emerald-800 border border-emerald-200/60";
        if (row.type === "Plan upgrade") badgeColor = "bg-indigo-50 text-indigo-800 border border-indigo-200/60";
        if (row.type === "Credits top-up") badgeColor = "bg-blue-50 text-blue-800 border border-blue-200/60";
        if (row.type === "Team member package") badgeColor = "bg-amber-50 text-amber-800 border border-amber-200/60";
        if (row.type === "Add-on") badgeColor = "bg-purple-50 text-purple-800 border border-purple-200/60";

        return (
          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {row.type}
          </span>
        );
      },
    },
    {
      key: "items",
      header: "ITEMS",
      render: (row) => (
        <span className="text-xs text-gray-700 truncate max-w-[180px] inline-block" title={row.items.map((i) => `${i.title} (${i.quantity})`).join(", ")}>
          {row.items[0]?.title} {row.items.length > 1 ? `+${row.items.length - 1} more` : ""}
        </span>
      ),
    },
    {
      key: "amount",
      header: "AMOUNT",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-bold text-gray-900 tabular-nums">
          ${(row.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "paymentStatus",
      header: "PAYMENT",
      render: (row) => {
        if (row.paymentStatus === "Paid") {
          return (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Paid
            </span>
          );
        }
        if (row.paymentStatus === "Pending") {
          return (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              Pending
            </span>
          );
        }
        if (row.paymentStatus === "Refunded") {
          return (
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              Refunded
            </span>
          );
        }
        return (
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {row.paymentStatus}
          </span>
        );
      },
    },
    {
      key: "paymentMethod",
      header: "PAYMENT METHOD",
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono text-[11px] tabular-nums">
          {row.paymentMethod}
        </span>
      ),
    },
  ];

  // Table Row Actions (⋮)
  const rowActions: TableRowAction<AdminOrderItem>[] = [
    {
      label: "View Order & Receipts",
      icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => setSelectedOrder(item),
    },
    {
      label: "Mark as Paid",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      disabled: (item) => item.paymentStatus === "Paid",
      onClick: (item) => handleMarkPaid(item),
    },
    {
      label: "Issue Refund",
      icon: <RotateCcw className="w-3.5 h-3.5 text-rose-600" />,
      disabled: (item) => item.paymentStatus !== "Paid",
      onClick: (item) => setOrderToRefund(item),
    },
    {
      label: "Cancel Order",
      icon: <XCircle className="w-3.5 h-3.5 text-amber-600" />,
      disabled: (item) => item.orderStatus === "Cancelled",
      onClick: (item) => setOrderToCancel(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Orders"
        subtitle="Cross-tenant order tracking, payment settlements, top-ups, and reconciliation"
      />

      <div className="p-6 space-y-5">
        {/* KPI Summary Capsules (G4) */}
        <MetricCapsuleRow
          items={[
            {
              label: "TOTAL ORDERS",
              value: metrics.totalCount,
              subLabel: "all time",
              icon: <ShoppingCart className="w-3.5 h-3.5" />,
            },
            {
              label: "SETTLED AMOUNT",
              value: `$${metrics.settledAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              subLabel: "paid",
              icon: <CheckCircle2 className="w-3.5 h-3.5" />,
              valueColor: "#15803D",
            },
            {
              label: "PENDING ORDERS",
              value: metrics.pendingCount,
              subLabel: "processing",
              icon: <Clock className="w-3.5 h-3.5" />,
              valueColor: metrics.pendingCount > 0 ? "#B45309" : undefined,
            },
            {
              label: "REFUNDED",
              value: `$${metrics.refundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              subLabel: "settled back",
              icon: <RotateCcw className="w-3.5 h-3.5" />,
            },
          ]}
        />

        {/* Filters Toolbar powered by PageTopBar */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search order ID, org, or method..."
          onExport={handleExportCsv}
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              {/* Order Type filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[140px] transition-colors"
                >
                  <option value="all">All Order Types</option>
                  <option value="New plan">New plan</option>
                  <option value="Plan upgrade">Plan upgrade</option>
                  <option value="Credits top-up">Credits top-up</option>
                  <option value="Team member package">Team member package</option>
                  <option value="Add-on">Add-on</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Payment Status filter */}
              <div className="relative">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Failed">Failed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Order Status filter */}
              <div className="relative">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[125px] transition-colors"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          }
        />

        {/* Orders Table */}
        <TableComponent
          data={filteredOrders}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
          onRowClick={(item) => setSelectedOrder(item)}
        />
      </div>

      {/* Order Detail Drawer */}
      <DrawerShell
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order ${selectedOrder?.id}`}
        subtitle={`${selectedOrder?.orgName} (${selectedOrder?.orgCode})`}
        width="max-w-xl"
        icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
      >
        {selectedOrder && (
          <div className="p-6 space-y-6">
            {/* Header Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Total Amount</span>
                  <div className="text-2xl font-bold font-display text-slate-900 tabular-nums">
                    ${selectedOrder.amount.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {selectedOrder.paymentStatus}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedOrder.orderStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2 flex justify-between text-xs text-slate-600">
                <span>Payment Method: <strong className="text-slate-900">{selectedOrder.paymentMethod}</strong></span>
                <span>Date: {new Date(selectedOrder.createdDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Purchased Line Items
              </h4>
              <div className="divide-y divide-slate-100">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-slate-500">Qty: {item.quantity} · Unit: ${item.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Audit & Settlement Timeline
              </h4>
              <div className="space-y-2">
                {selectedOrder.timeline.map((event, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{event.status}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {new Date(event.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">{event.note}</div>
                    {event.actor && <div className="text-[10px] text-slate-400 mt-0.5">Actor: {event.actor}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Admin Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {selectedOrder.receiptUrl ? (
                <a
                  href={selectedOrder.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download PDF Receipt
                </a>
              ) : (
                <span className="text-xs text-slate-400">No PDF attached</span>
              )}

              <div className="flex items-center gap-2">
                {selectedOrder.paymentStatus !== "Paid" && (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Mark Paid
                  </button>
                )}
                {selectedOrder.paymentStatus === "Paid" && (
                  <button
                    type="button"
                    onClick={() => setOrderToRefund(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Issue Refund
                  </button>
                )}
                {selectedOrder.orderStatus !== "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => setOrderToCancel(selectedOrder)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </DrawerShell>

      {/* Refund Modal */}
      {orderToRefund && (
        <Modal
          isOpen={true}
          onClose={() => setOrderToRefund(null)}
          title={`Issue Refund for ${orderToRefund.id}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              You are about to issue a full refund of{" "}
              <strong className="text-slate-900">${orderToRefund.amount.toFixed(2)}</strong> to{" "}
              {orderToRefund.orgName}. This action will be permanently recorded in the Audit Logs.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Refund Reason
              </label>
              <textarea
                rows={3}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Accidental double charge, client requested downgrade..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToRefund(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {orderToCancel && (
        <Modal
          isOpen={true}
          onClose={() => setOrderToCancel(null)}
          title={`Cancel Order ${orderToCancel.id}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Cancel order <strong className="text-slate-900">{orderToCancel.id}</strong> for{" "}
              {orderToCancel.orgName}.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cancellation Reason
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Unfulfilled payment verification..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

